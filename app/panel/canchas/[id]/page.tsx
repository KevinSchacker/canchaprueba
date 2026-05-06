import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarX, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourtForm } from "@/components/owner/court-form"
import { buildSchedulesFromInitial } from "@/lib/owner/utils"

export const dynamic = "force-dynamic"

export default async function EditCourtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  if (!user) {
    redirect("/auth/login")
  }

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user.id).maybeSingle()
  if (!venue) {
    redirect("/panel/complejo")
  }

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select(
      `id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes, deposit_percentage, active,
       description, max_players, cancellation_hours_before, cancellation_refund_pct,
       max_days_ahead, min_hours_ahead, price_rules, venue_id, sports(slug)`,
    )
    .eq("id", id)
    .eq("venue_id", venue.id)
    .maybeSingle()

  if (courtError || !court) {
    console.error("Error loading court:", courtError)
    notFound()
  }

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
    const csRaw = s.court_schedules as unknown
    const courtSchedules: Sched[] = Array.isArray(csRaw) ? csRaw : (csRaw ? [csRaw as Sched] : [])
    
    const raw = courtSchedules.map((cs) => ({
      dayOfWeek: cs.day_of_week,
      openTime: (cs.open_time || "00:00").slice(0, 5),
      closeTime: (cs.close_time || "00:00").slice(0, 5),
    }))
    return { name: s.name, schedules: buildSchedulesFromInitial(raw) }
  })

  // Asegurarnos de que court.sports no sea un array y manejar nulos
  const sportObj = Array.isArray(court.sports) ? court.sports[0] : court.sports
  const sportSlug = sportObj?.slug || "padel"

  // Extraer price_rules de forma segura
  const priceRules = (court.price_rules as any) || {}

  const safeNumber = (val: any, fallback: number | null = 0) => {
    const n = Number(val)
    return isNaN(n) ? fallback : n
  }

  // Next.js throws if we pass `undefined` to Client Components.
  // This helper completely removes any undefined values from the object tree.
  const sanitizeProps = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj))

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
        sports={sanitizeProps(sports ?? [])}
        siblingsSchedules={sanitizeProps(siblingsSchedules)}
        initial={sanitizeProps({
          id: court.id,
          name: court.name || "",
          surface: court.surface || "",
          indoor: !!court.indoor,
          hasLighting: !!court.has_lighting,
          pricePerSlot: safeNumber(court.price_per_slot, 0) as number,
          slotDurationMinutes: safeNumber(court.slot_duration_minutes, 60) as number,
          depositPercentage: safeNumber(court.deposit_percentage, 0) as number,
          active: !!court.active,
          sportSlug: sportSlug,
          schedules: (schedules ?? []).map((s) => ({
            dayOfWeek: s.day_of_week,
            openTime: (s.open_time || "00:00").slice(0, 5),
            closeTime: (s.close_time || "00:00").slice(0, 5),
          })),
          description: court.description || "",
          maxPlayers: safeNumber(court.max_players, 4) as number,
          cancellationHoursBefore: safeNumber(court.cancellation_hours_before, 24) as number,
          cancellationRefundPct: safeNumber(court.cancellation_refund_pct, 100) as number,
          maxDaysAhead: safeNumber(court.max_days_ahead, 14) as number,
          minHoursAhead: safeNumber(court.min_hours_ahead, 1) as number,
          nightPriceEnabled: !!(priceRules?.night),
          nightPriceFrom: priceRules?.night?.from || "20:00",
          nightPriceTo: priceRules?.night?.to || "23:00",
          nightPrice: priceRules?.night?.price !== undefined && priceRules?.night?.price !== null ? safeNumber(priceRules.night.price, null) : null,
          weekendPriceEnabled: !!(priceRules?.weekend),
          weekendPrice: priceRules?.weekend?.price !== undefined && priceRules?.weekend?.price !== null ? safeNumber(priceRules.weekend.price, null) : null,
          images: (images || []).map((img) => ({ 
            id: img.id, 
            url: img.url, 
            position: img.position || 0 
          })),
        })}
      />
    </div>
  )
}
