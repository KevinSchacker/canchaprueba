import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CourtForm } from "@/components/owner/court-form"

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
      `id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes, deposit_percentage, active, venue_id, sports!inner(slug)`,
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

  type Court = typeof court & { sports: { slug: string } }
  const c = court as unknown as Court

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
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/canchas/${id}/bloqueos`}>
              <CalendarX className="h-4 w-4" /> Gestionar bloqueos
            </Link>
          </Button>
        </div>
      </div>

      <CourtForm
        venueId={venue.id}
        sports={sports ?? []}
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
        }}
      />
    </div>
  )
}
