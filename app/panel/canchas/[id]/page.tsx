import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarX, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourtForm } from "@/components/owner/court-form"
import { buildSchedulesFromInitial } from "@/components/owner/schedule-editor"

export const dynamic = "force-dynamic"

export default async function EditCourtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()
  if (!venue) redirect("/panel/complejo")

  const { data: court } = await supabase
    .from("courts")
    .select(
      `id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes, deposit_percentage, active,
       description, max_players, cancellation_hours_before, cancellation_refund_pct,
       max_days_ahead, min_hours_ahead, price_rules, venue_id, sports!inner(slug)`,
    )
    .eq("id", id)
    .eq("venue_id", venue.id)
    .maybeSingle()

  if (!court) notFound()

  const { data: schedules } = await supabase
    .from("court_schedules")
    .select("day_of_week, open_time, close_time")
    .eq("court_id", id)
    .order("day_of_week")

  const { data: sports } = await supabase.from("sports").select("id, slug, name, active").order("name")
  
  const { data: images } = await supabase
    .from("court_images")
    .select("id, url, position")
    .eq("court_id", id)
    .order("position")

  // Cargar horarios de las otras canchas del mismo complejo para el atajo "Igual que otra cancha"
  const { data: siblings } = await supabase
    .from("courts")
    .select("id, name, court_schedules(day_of_week, open_time, close_time)")
    .eq("venue_id", venue.id)
    .neq("id", id)

  const siblingsSchedules = (siblings ?? []).map((s) => {
    type Sched = { day_of_week: number; open_time: string; close_time: string }
    const raw = (s.court_schedules as unknown as Sched[]).map((cs) => ({
      dayOfWeek: cs.day_of_week,
      openTime: cs.open_time.slice(0, 5),
      closeTime: cs.close_time.slice(0, 5),
    }))
    return { name: s.name, schedules: buildSchedulesFromInitial(raw) }
  })

  type Court = typeof court & { sports: { slug: string }; price_rules: Record<string, unknown> | null }
  const c = court as unknown as Court

  // Extraer price_rules
  const priceRules = c.price_rules as {
    night?: { from: string; to: string; price: number } | null
    weekend?: { price: number } | null
  } | null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/canchas"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a canchas
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Editar cancha</h1>
          <div className="flex items-center gap-2">
            {/* Ver como jugador */}
            <Button asChild variant="outline" size="sm">
              <Link href={`/play/cancha/${id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" /> Ver como jugador
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/panel/canchas/${id}/bloqueos`}>
                <CalendarX className="h-4 w-4" /> Gestionar bloqueos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <CourtForm
        venueId={venue.id}
        sports={sports ?? []}
        siblingsSchedules={siblingsSchedules}
        initial={{
          id: c.id,
          name: c.name,
          surface: c.surface,
          indoor: c.indoor,
          hasLighting: c.has_lighting,
          pricePerSlot: Number(c.price_per_slot),
          slotDurationMinutes: c.slot_duration_minutes,
          depositPercentage: c.deposit_percentage,
          active: c.active,
          sportSlug: c.sports.slug,
          schedules: (schedules ?? []).map((s) => ({
            dayOfWeek: s.day_of_week,
            openTime: s.open_time.slice(0, 5),
            closeTime: s.close_time.slice(0, 5),
          })),
          description: c.description as string | null,
          maxPlayers: c.max_players as number | null,
          cancellationHoursBefore: c.cancellation_hours_before as number | null,
          cancellationRefundPct: c.cancellation_refund_pct as number | null,
          maxDaysAhead: c.max_days_ahead as number | null,
          minHoursAhead: c.min_hours_ahead as number | null,
          nightPriceEnabled: !!(priceRules?.night),
          nightPriceFrom: priceRules?.night?.from ?? "20:00",
          nightPriceTo: priceRules?.night?.to ?? "23:00",
          nightPrice: priceRules?.night?.price ?? null,
          weekendPriceEnabled: !!(priceRules?.weekend),
          weekendPrice: priceRules?.weekend?.price ?? null,
          images: (images ?? []).map((img) => ({ id: img.id, url: img.url, position: img.position })),
        }}
      />
    </div>
  )
}
