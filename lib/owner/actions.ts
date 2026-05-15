"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/dashboard")
  }
  return { supabase, userId: user.id }
}

// ============= VENUES =============

export type VenueInput = {
  id?: string
  name: string
  description?: string
  address: string
  city: string
  phone?: string
  coverImageUrl?: string
}

export async function upsertVenue(input: VenueInput) {
  const { supabase, userId } = await requireOwner()

  // Geocodificar la dirección automáticamente con OpenStreetMap Nominatim
  let latitude: number | null = null
  let longitude: number | null = null
  try {
    const query = encodeURIComponent(`${input.address}, ${input.city}, Misiones, Argentina`)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "CanchAR/1.0" }, next: { revalidate: 0 } }
    )
    const geoData = await geoRes.json()
    if (geoData && geoData.length > 0) {
      latitude = parseFloat(geoData[0].lat)
      longitude = parseFloat(geoData[0].lon)
    }
  } catch {
    // Si falla la geocodificación, guardamos sin coordenadas
  }

  const payload = {
    owner_id: userId,
    name: input.name,
    description: input.description || null,
    address: input.address,
    city: input.city,
    phone: input.phone || null,
    cover_image_url: input.coverImageUrl || null,
    province: "Misiones",
    active: true,
    latitude,
    longitude,
  }

  if (input.id) {
    const { error } = await supabase.from("venues").update(payload).eq("id", input.id).eq("owner_id", userId)
    if (error) return { ok: false as const, error: error.message }
    revalidatePath("/panel")
    revalidatePath("/panel/complejo")
    return { ok: true as const, id: input.id }
  }

  const { data, error } = await supabase.from("venues").insert(payload).select("id").single()
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel")
  revalidatePath("/panel/complejo")
  return { ok: true as const, id: data.id }
}

// ============= COURTS =============

export type CourtScheduleInput = {
  dayOfWeek: number // 0-6
  openTime: string // HH:mm
  closeTime: string // HH:mm
}

export type PriceRules = {
  night?: { from: string; to: string; price: number } | null
  weekend?: { price: number } | null
}

export type CourtInput = {
  id?: string
  venueId: string
  sportSlug: string
  name: string
  surface?: string
  indoor: boolean
  hasLighting: boolean
  pricePerSlot: number
  slotDurationMinutes: number
  depositPercentage: number
  active: boolean
  schedules: CourtScheduleInput[]
  description?: string | null
  maxPlayers?: number | null
  cancellationHoursBefore?: number | null
  cancellationRefundPct?: number | null
  maxDaysAhead?: number | null
  minHoursAhead?: number | null
  priceRules?: PriceRules | null
}

export async function upsertCourt(input: CourtInput) {
  const { supabase, userId } = await requireOwner()

  const { data: venue, error: venueErr } = await supabase
    .from("venues")
    .select("id, owner_id")
    .eq("id", input.venueId)
    .maybeSingle()
  if (venueErr || !venue || venue.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre ese complejo." }
  }

  if (!input.id) {
    const { data: sub } = await supabase
      .from("owner_subscriptions")
      .select("plan")
      .eq("owner_id", userId)
      .maybeSingle()
    
    const plan = sub?.plan || "basic"
    const maxCourts = plan === "premium" ? 5 : 1

    const { count, error: countErr } = await supabase
      .from("courts")
      .select("id, venues!inner(owner_id)", { count: "exact", head: true })
      .eq("venues.owner_id", userId)
    
    if (count !== null && count >= maxCourts) {
      return { ok: false as const, error: `Límite alcanzado: Tu plan ${plan} permite hasta ${maxCourts} cancha(s).` }
    }
  }

  const { data: sport } = await supabase.from("sports").select("id").eq("slug", input.sportSlug).maybeSingle()
  if (!sport) return { ok: false as const, error: "Deporte no válido." }

  const payload = {
    venue_id: input.venueId,
    sport_id: sport.id,
    name: input.name,
    surface: input.surface || null,
    indoor: input.indoor,
    has_lighting: input.hasLighting,
    price_per_slot: input.pricePerSlot,
    slot_duration_minutes: input.slotDurationMinutes,
    deposit_percentage: input.depositPercentage,
    active: input.active,
    description: input.description ?? null,
    max_players: input.maxPlayers ?? null,
    cancellation_hours_before: input.cancellationHoursBefore ?? null,
    cancellation_refund_pct: input.cancellationRefundPct ?? null,
    max_days_ahead: input.maxDaysAhead ?? null,
    min_hours_ahead: input.minHoursAhead ?? null,
    price_rules: input.priceRules ?? null,
  }

  let courtId: string

  if (input.id) {
    const { error } = await supabase.from("courts").update(payload).eq("id", input.id)
    if (error) return { ok: false as const, error: error.message }
    courtId = input.id
  } else {
    const { data, error } = await supabase.from("courts").insert(payload).select("id").single()
    if (error) return { ok: false as const, error: error.message }
    courtId = data.id
  }

  // Reemplazar horarios completamente
  await supabase.from("court_schedules").delete().eq("court_id", courtId)
  if (input.schedules.length > 0) {
    const rows = input.schedules.map((s) => ({
      court_id: courtId,
      day_of_week: s.dayOfWeek,
      open_time: s.openTime,
      close_time: s.closeTime,
    }))
    const { error } = await supabase.from("court_schedules").insert(rows)
    if (error) return { ok: false as const, error: error.message }
  }

  revalidatePath("/panel")
  revalidatePath("/panel/canchas")
  revalidatePath(`/panel/canchas/${courtId}`)
  return { ok: true as const, id: courtId }
}

export async function toggleCourtActive(courtId: string, active: boolean) {
  const { supabase } = await requireOwner()
  const { error } = await supabase.from("courts").update({ active }).eq("id", courtId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel/canchas")
  return { ok: true as const }
}

// ============= BOOKINGS =============

export async function setBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled" | "completed" | "no_show",
) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, courts!inner ( venues!inner ( owner_id ) )")
    .eq("id", bookingId)
    .maybeSingle()

  type BookingCheck = { id: string; courts: { venues: { owner_id: string } } }
  const b = booking as unknown as BookingCheck | null
  if (!b || b.courts.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta reserva." }
  }

  const update: Record<string, unknown> = { status }
  if (status === "cancelled") update.cancelled_at = new Date().toISOString()

  const { error } = await supabase.from("bookings").update(update).eq("id", bookingId)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel")
  revalidatePath("/panel/reservas")
  return { ok: true as const }
}
export async function setBookingPaidFull(bookingId: string, paymentMethod: string) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, courts!inner ( venues!inner ( owner_id ) )")
    .eq("id", bookingId)
    .maybeSingle()

  type BookingCheck = { id: string; courts: { venues: { owner_id: string } } }
  const b = booking as unknown as BookingCheck | null
  if (!b || b.courts.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta reserva." }
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      deposit_paid: true,
      status: "completed",
      // Guardamos el método en notas si no hay columna dedicada
      notes: `Saldo cobrado — método: ${paymentMethod}`,
    })
    .eq("id", bookingId)

  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/panel")
  revalidatePath("/panel/reservas")
  return { ok: true as const }
}

// ============= EGRESOS DE CAJA =============

export type EgresoInput = {
  venueId: string
  amount: number
  concept: string
  method?: string
}

export async function registerEgreso(input: EgresoInput) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership del venue
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", input.venueId)
    .eq("owner_id", userId)
    .maybeSingle()
  if (!venue) return { ok: false as const, error: "No tenés permisos sobre este complejo." }

  // Guardar en tabla cash_movements
  const { error } = await supabase.from("cash_movements").insert({
    venue_id: input.venueId,
    type: "egreso",
    amount: input.amount,
    concept: input.concept,
    method: input.method ?? null,
    created_by: userId,
  })

  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/panel")
  return { ok: true as const }
}

// ============= IMAGES =============

export type CourtImageInput = {
  url: string
  position: number
}

export async function upsertCourtImages(courtId: string, images: CourtImageInput[]) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership de la cancha
  const { data: court, error: courtErr } = await supabase
    .from("courts")
    .select("id, venues!inner(owner_id)")
    .eq("id", courtId)
    .maybeSingle()

  type CourtCheck = { id: string; venues: { owner_id: string } }
  const c = court as unknown as CourtCheck | null
  if (courtErr || !c || c.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta cancha." }
  }

  // Reemplazar imágenes
  await supabase.from("court_images").delete().eq("court_id", courtId)
  if (images.length > 0) {
    const rows = images.map((img) => ({
      court_id: courtId,
      url: img.url,
      position: img.position,
    }))
    const { error } = await supabase.from("court_images").insert(rows)
    if (error) return { ok: false as const, error: error.message }
  }

  revalidatePath("/panel/canchas")
  revalidatePath(`/panel/canchas/${courtId}`)
  return { ok: true as const }
}

// ============= QUICK BOOKING (dueño crea turno presencial) =============

export type QuickBookingInput = {
  courtId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  guestName: string
  guestPhone?: string
  paymentMethod: string
  depositPaid: boolean
  notes?: string
  durationMinutes?: number
}

export async function createQuickBooking(input: QuickBookingInput) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership de la cancha
  const { data: court } = await supabase
    .from("courts")
    .select("id, price_per_slot, deposit_percentage, slot_duration_minutes, venues!inner(owner_id)")
    .eq("id", input.courtId)
    .maybeSingle()

  type CourtCheck = { id: string; price_per_slot: number; deposit_percentage: number; slot_duration_minutes: number; venues: { owner_id: string } }
  const c = court as unknown as CourtCheck | null
  if (!c || c.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta cancha." }
  }

  // Calcular start/end
  const [hh, mm] = input.time.split(":").map(Number)
  const startDate = new Date(`${input.date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`)
  const duration = input.durationMinutes || c.slot_duration_minutes
  const endDate = new Date(startDate.getTime() + duration * 60_000)

  // Chequear superposición (conflictos)
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("court_id", input.courtId)
    .in("status", ["pending", "confirmed"])
    .lt("start_time", endDate.toISOString())
    .gt("end_time", startDate.toISOString())
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    return { ok: false as const, error: "Ya existe una reserva que se superpone con este horario." }
  }

  const slotsNeeded = Math.max(1, Math.ceil(duration / c.slot_duration_minutes))
  const totalPrice = c.price_per_slot * slotsNeeded
  const depositAmount = Math.round((c.deposit_percentage / 100) * totalPrice)

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      court_id: input.courtId,
      player_id: null,
      guest_name: input.guestName,
      guest_phone: input.guestPhone || null,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: input.depositPaid ? "confirmed" : "pending",
      total_price: totalPrice,
      deposit_amount: depositAmount,
      deposit_paid: input.depositPaid,
      notes: input.notes ? `[${input.paymentMethod}] ${input.notes}` : `[${input.paymentMethod}]`,
    })
    .select("id")
    .single()

  if (error) return { ok: false as const, error: error.message }

  revalidatePath("/panel")
  revalidatePath("/panel/reservas")
  return { ok: true as const, id: data.id }
}

