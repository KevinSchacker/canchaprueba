"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { checkPlayerPenalty } from "./penalty"

type CreateBookingInput = {
  courtId: string
  startTime: string // ISO
  endTime: string // ISO
  totalPrice: number
}

export async function createBooking(input: CreateBookingInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id, price_per_slot, deposit_percentage, active")
    .eq("id", input.courtId)
    .maybeSingle()

  if (courtError || !court || !court.active) {
    return { ok: false as const, error: "La cancha no está disponible." }
  }

  const totalPrice = input.totalPrice
  
  const forceFullPayment = await checkPlayerPenalty(supabase, user.id)
  const depositAmount = forceFullPayment
    ? totalPrice
    : Math.round((totalPrice * court.deposit_percentage) / 100)

  // 1. Limpiar reservas 'pending' expiradas (Soft Lock de 10 minutos)
  // Esto libera el constraint 'bookings_no_overlap' en Postgres.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  await supabase
    .from("bookings")
    .update({ status: "cancelled", notes: "Soft-lock expirado" })
    .eq("court_id", court.id)
    .eq("status", "pending")
    .lt("created_at", tenMinutesAgo)
    // idealmente cruzar start_time / end_time para ser quirúrgicos,
    // pero limpiar todas las expiradas de la cancha es seguro y mantiene la BD limpia.

  // 2. Intentar crear la reserva
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      court_id: court.id,
      player_id: user.id,
      start_time: input.startTime,
      end_time: input.endTime,
      status: "pending",
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: false,
    })
    .select("id")
    .single()

  if (error) {
    // 23P01 = exclusion violation (constraint bookings_no_overlap)
    if (error.code === "23P01" || error.message?.toLowerCase().includes("overlap")) {
      return {
        ok: false as const,
        error: "Justo se reservó ese horario. Probá con otro turno.",
      }
    }
    return { ok: false as const, error: error.message }
  }

  revalidatePath("/play")
  return { ok: true as const, bookingId: data.id }
}

/**
 * Pago de seña MOCK. En producción esto se reemplaza por un webhook
 * de MercadoPago que confirma la transacción.
 */
export async function payDepositMock(bookingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: booking, error: bError } = await supabase
    .from("bookings")
    .select("status, court_id, start_time, end_time")
    .eq("id", bookingId)
    .single()

  if (bError || !booking) return { ok: false, error: "Reserva no encontrada." }

  let notes = null

  if (booking.status === "cancelled") {
    // Si llegó tarde el pago (pasaron los 10 min y se canceló por Soft Lock)
    // Verificamos si alguien más ya tomó el turno
    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("court_id", booking.court_id)
      .in("status", ["pending", "confirmed"])
      // Chequeo básico de colisión exacta
      .eq("start_time", booking.start_time)
      .maybeSingle()

    if (overlapping) {
      // En un Webhook real de MercadoPago, aquí se dispara el reembolso automático (refund).
      return { ok: false, error: "Tu reserva expiró (10 min) y alguien más tomó el turno. Te contactaremos para el reembolso." }
    }
    notes = "Recuperada post-expiración (pago tardío)"
  }

  const { error } = await supabase
    .from("bookings")
    .update({ 
      deposit_paid: true, 
      status: "confirmed",
      ...(notes ? { notes } : {})
    })
    .eq("id", bookingId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath(`/play/reserva/${bookingId}`)
  revalidatePath("/play/mis-reservas")
  return { ok: true as const }
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("player_id", user.id)

  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/play/mis-reservas")
  return { ok: true as const }
}
