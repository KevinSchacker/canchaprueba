"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type CreateBookingInput = {
  courtId: string
  startTime: string // ISO
  endTime: string // ISO
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

  const totalPrice = Number(court.price_per_slot)
  const depositAmount = Math.round((totalPrice * court.deposit_percentage) / 100)

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

  const { error } = await supabase
    .from("bookings")
    .update({ deposit_paid: true, status: "confirmed" })
    .eq("id", bookingId)
    .eq("player_id", user.id)

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
