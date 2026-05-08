"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const MATERIALIZE_WEEKS = 8

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/dashboard")
  }
  return { supabase, userId: user.id }
}

export type SeriesInput = {
  id?: string
  courtId: string
  guestName: string
  guestPhone?: string
  dayOfWeek: number // 0 = domingo
  startTime: string // HH:mm
  durationMinutes: number
  startsOn: string // YYYY-MM-DD
  pricePerSlot: number
  monthlyPayment: boolean
  notes?: string
}

/** Calcula la próxima fecha (>= startsOn) que cae en el dayOfWeek dado. */
function firstOccurrence(startsOn: string, dayOfWeek: number): Date {
  const [y, m, d] = startsOn.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  while (date.getDay() !== dayOfWeek) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

function combineDateTime(date: Date, time: string): Date {
  const [hh, mm] = time.split(":").map(Number)
  const out = new Date(date)
  out.setHours(hh, mm, 0, 0)
  return out
}

/**
 * Materializa las próximas N semanas de la serie en `bookings`.
 * Cada booking lleva series_id, status='confirmed' y deposit_paid=true
 * (porque el cobro es pactado con el dueño, no digital).
 * El constraint anti-doble-reserva de Postgres se encarga de evitar choques:
 * si una semana puntual choca con otra reserva, esa semana se omite y se sigue.
 */
async function materializeSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
  input: SeriesInput,
) {
  const first = firstOccurrence(input.startsOn, input.dayOfWeek)

  for (let week = 0; week < MATERIALIZE_WEEKS; week++) {
    const occurDate = new Date(first)
    occurDate.setDate(first.getDate() + week * 7)

    const start = combineDateTime(occurDate, input.startTime)
    const end = new Date(start.getTime() + input.durationMinutes * 60_000)

    // intentamos insertar; si choca con otra reserva por el constraint EXCLUDE,
    // ignoramos esa ocurrencia y seguimos con la siguiente semana.
    const { error } = await supabase.from("bookings").insert({
      court_id: input.courtId,
      player_id: null,
      guest_name: input.guestName,
      guest_phone: input.guestPhone || null,
      series_id: seriesId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
      total_price: input.pricePerSlot,
      deposit_amount: 0,
      deposit_paid: true,
    })
    if (error && !/exclu/i.test(error.message) && !/conflict/i.test(error.message)) {
      // Error real (permisos, validación), abortamos
      return { ok: false as const, error: error.message }
    }
  }
  return { ok: true as const }
}

/** Borra todas las reservas futuras (>= ahora) de una serie. */
async function deleteFutureBookingsOfSeries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seriesId: string,
) {
  await supabase
    .from("bookings")
    .delete()
    .eq("series_id", seriesId)
    .gte("start_time", new Date().toISOString())
}

export async function upsertSeries(input: SeriesInput) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership de la cancha
  const { data: court } = await supabase
    .from("courts")
    .select("id, venues!inner ( owner_id )")
    .eq("id", input.courtId)
    .maybeSingle()
  type Check = { id: string; venues: { owner_id: string } }
  const c = court as unknown as Check | null
  if (!c || c.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta cancha." }
  }

  const payload = {
    court_id: input.courtId,
    guest_name: input.guestName,
    guest_phone: input.guestPhone || null,
    day_of_week: input.dayOfWeek,
    start_time: input.startTime,
    duration_minutes: input.durationMinutes,
    starts_on: input.startsOn,
    price_per_slot: input.pricePerSlot,
    monthly_payment: input.monthlyPayment,
    notes: input.notes || null,
    status: "active" as const,
  }

  let seriesId: string

  if (input.id) {
    // Update + remateralizar futuro
    const { error } = await supabase.from("booking_series").update(payload).eq("id", input.id)
    if (error) return { ok: false as const, error: error.message }
    seriesId = input.id
    await deleteFutureBookingsOfSeries(supabase, seriesId)
  } else {
    const { data, error } = await supabase.from("booking_series").insert(payload).select("id").single()
    if (error) return { ok: false as const, error: error.message }
    seriesId = data.id
  }

  const mat = await materializeSeries(supabase, seriesId, input)
  if (!mat.ok) return mat

  revalidatePath("/panel")
  revalidatePath("/panel/fijos")
  revalidatePath("/panel/reservas")
  return { ok: true as const, id: seriesId }
}

export async function setSeriesStatus(seriesId: string, status: "active" | "paused" | "cancelled") {
  const { supabase, userId } = await requireOwner()

  const { data: series } = await supabase
    .from("booking_series")
    .select("id, courts!inner ( venues!inner ( owner_id ) )")
    .eq("id", seriesId)
    .maybeSingle()
  type Check = { id: string; courts: { venues: { owner_id: string } } }
  const s = series as unknown as Check | null
  if (!s || s.courts.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta serie." }
  }

  const { error } = await supabase.from("booking_series").update({ status }).eq("id", seriesId)
  if (error) return { ok: false as const, error: error.message }

  // Si se pausa o cancela, borramos las reservas futuras para liberar slots
  if (status !== "active") {
    await deleteFutureBookingsOfSeries(supabase, seriesId)
  }

  revalidatePath("/panel/fijos")
  revalidatePath("/panel/reservas")
  return { ok: true as const }
}

export async function markSeriesPaid(seriesId: string, paidUntil: string) {
  const { supabase } = await requireOwner()
  const { error } = await supabase.from("booking_series").update({ paid_until: paidUntil }).eq("id", seriesId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel/fijos")
  return { ok: true as const }
}

export async function deleteSeries(seriesId: string) {
  const { supabase } = await requireOwner()
  // primero borramos futuras, después la serie
  await deleteFutureBookingsOfSeries(supabase, seriesId)
  const { error } = await supabase.from("booking_series").delete().eq("id", seriesId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel/fijos")
  revalidatePath("/panel/reservas")
  return { ok: true as const }
}

/**
 * Libera SOLO una ocurrencia de la serie para una fecha específica.
 * Cancela el booking de esa semana puntual sin tocar el resto del contrato fijo.
 */
export async function releaseSeriesException(seriesId: string, date: string, reason: string) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership
  const { data: series } = await supabase
    .from("booking_series")
    .select("id, courts!inner ( venues!inner ( owner_id ) )")
    .eq("id", seriesId)
    .maybeSingle()
  type Check = { id: string; courts: { venues: { owner_id: string } } }
  const s = series as unknown as Check | null
  if (!s || s.courts.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta serie." }
  }

  // Cancelar el booking de esa fecha específica (que pertence a esta serie)
  // El booking tiene start_time con fecha == date
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      notes: `Excepción — ${reason}`,
    })
    .eq("series_id", seriesId)
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)

  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/panel/fijos")
  revalidatePath("/panel/reservas")
  return { ok: true as const }
}

