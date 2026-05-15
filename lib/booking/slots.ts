import { createClient } from "@/lib/supabase/server"

export type Slot = {
  start: string // ISO
  end: string // ISO
  label: string // HH:mm
  available: boolean
  price: number
  reason?: "past" | "booked" | "fixed" | "blocked"
}

/**
 * Genera todos los slots posibles para una cancha en una fecha dada,
 * marcando cuáles están libres y cuáles ocupados según las reservas
 * activas (pending o confirmed) y los bloqueos puntuales.
 *
 * Si la reserva proviene de una serie (turno fijo) lo informa con reason="fixed".
 *
 * Asume que `date` viene en formato YYYY-MM-DD (zona local).
 */
export async function getAvailableSlots(courtId: string, date: string): Promise<Slot[]> {
  const supabase = await createClient()

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id, slot_duration_minutes, price_per_slot, price_rules")
    .eq("id", courtId)
    .maybeSingle()

  if (courtError || !court) return []

  // Day of week en hora local (0 = domingo)
  const [year, month, day] = date.split("-").map(Number)
  const localDate = new Date(year, month - 1, day)
  const dow = localDate.getDay()

  const { data: schedules } = await supabase
    .from("court_schedules")
    .select("open_time, close_time")
    .eq("court_id", courtId)
    .eq("day_of_week", dow)

  if (!schedules || schedules.length === 0) return []

  // Reservas activas y bloqueos del día
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0).toISOString()

  const [{ data: bookings }, { data: blackouts }] = await Promise.all([
    supabase
      .from("bookings")
      .select("start_time, end_time, status, series_id, created_at")
      .eq("court_id", courtId)
      .in("status", ["pending", "confirmed"])
      .gte("start_time", dayStart)
      .lt("start_time", dayEnd),
    supabase
      .from("court_blackouts")
      .select("start_time, end_time")
      .eq("court_id", courtId)
      .lt("start_time", dayEnd)
      .gt("end_time", dayStart),
  ])

  // Filter out pending bookings that are older than 10 minutes (soft lock expired)
  const validBookings = (bookings ?? []).filter((b) => {
    if (b.status === "confirmed") return true
    if (b.status === "pending") {
      const ageMs = Date.now() - new Date(b.created_at).getTime()
      return ageMs <= 10 * 60 * 1000 // 10 minutes
    }
    return false
  })

  type Range = { start: number; end: number; kind: "booking" | "fixed" | "blocked" }
  const ranges: Range[] = [
    ...validBookings.map<Range>((b) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
      kind: b.series_id ? "fixed" : "booking",
    })),
    ...(blackouts ?? []).map<Range>((b) => ({
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
      kind: "blocked",
    })),
  ]

  const slots: Slot[] = []
  const now = Date.now()
  const duration = court.slot_duration_minutes

  for (const sch of schedules) {
    const [openH, openM] = sch.open_time.split(":").map(Number)
    const [closeH, closeM] = sch.close_time.split(":").map(Number)

    let cursor = new Date(year, month - 1, day, openH, openM, 0).getTime()
    const endOfDay = new Date(year, month - 1, day, closeH, closeM, 0).getTime()

    while (cursor + duration * 60_000 <= endOfDay) {
      const slotStart = cursor
      const slotEnd = cursor + duration * 60_000

      const overlap = ranges.find((r) => r.start < slotEnd && r.end > slotStart)
      const inPast = slotStart < now

      const startDate = new Date(slotStart)
      const label = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`

      let reason: Slot["reason"] | undefined
      if (inPast) reason = "past"
      else if (overlap) reason = overlap.kind === "fixed" ? "fixed" : overlap.kind === "blocked" ? "blocked" : "booked"

      let slotPrice = Number(court.price_per_slot)
      const rules = court.price_rules as any || {}
      
      const isWeekend = dow === 0 || dow === 6
      if (isWeekend && rules.weekend?.price) {
        slotPrice = Number(rules.weekend.price)
      }

      if (rules.night?.from && rules.night?.to && rules.night?.price) {
        const [fromH, fromM] = rules.night.from.split(":").map(Number)
        const [toH, toM] = rules.night.to.split(":").map(Number)
        
        let nightFromTime = new Date(year, month - 1, day, fromH, fromM, 0).getTime()
        let nightToTime = new Date(year, month - 1, day, toH, toM, 0).getTime()
        if (nightToTime < nightFromTime) nightToTime += 24 * 60 * 60 * 1000 // handle crosses midnight
        
        // If slot falls entirely within night range, or mostly within night range.
        // Simplified: if slot start time is >= nightFromTime AND < nightToTime
        if (slotStart >= nightFromTime && slotStart < nightToTime) {
          slotPrice = Number(rules.night.price)
        }
      }

      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
        label,
        available: !overlap && !inPast,
        price: slotPrice,
        reason,
      })

      cursor = slotEnd
    }
  }

  return slots
}

/** Util: formatea YYYY-MM-DD a partir de un Date */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Devuelve los próximos N días con etiqueta amigable */
export function nextDays(count: number): { key: string; weekday: string; day: number; isToday: boolean }[] {
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: { key: string; weekday: string; day: number; isToday: boolean }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    out.push({
      key: toDateKey(d),
      weekday: weekdays[d.getDay()],
      day: d.getDate(),
      isToday: i === 0,
    })
  }
  return out
}
