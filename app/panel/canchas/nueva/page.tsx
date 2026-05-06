import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CourtForm } from "@/components/owner/court-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buildSchedulesFromInitial } from "@/lib/owner/utils"

export const dynamic = "force-dynamic"

export default async function NewCourtPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()
  if (!venue) redirect("/panel/complejo")

  const { data: sports } = await supabase.from("sports").select("id, slug, name, active").order("name")

  // Cargar horarios de otras canchas para el atajo "Igual que otra cancha"
  const { data: siblings } = await supabase
    .from("courts")
    .select("id, name, court_schedules(day_of_week, open_time, close_time)")
    .eq("venue_id", venue.id)

  // Next.js throws if we pass `undefined` to Client Components.
  // This helper completely removes any undefined values from the object tree.
  const sanitizeProps = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj))

  const siblingsSchedules = (siblings ?? []).map((s) => {
    type Sched = { day_of_week: number; open_time: string; close_time: string }
    const csRaw = s.court_schedules as unknown
    const courtSchedules: Sched[] = Array.isArray(csRaw) ? csRaw : (csRaw ? [csRaw as Sched] : [])
    const raw = courtSchedules.map((cs) => ({
      dayOfWeek: cs.day_of_week,
      openTime: (cs.open_time || "09:00").slice(0, 5),
      closeTime: (cs.close_time || "23:00").slice(0, 5),
    }))
    return { name: s.name, schedules: buildSchedulesFromInitial(raw) }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/panel/canchas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a canchas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Nueva cancha</h1>
        <p className="text-sm text-muted-foreground">Configurá nombre, precio, características y horarios.</p>
      </div>

      <CourtForm 
        venueId={venue.id} 
        sports={sanitizeProps(sports ?? [])} 
        initial={null} 
        siblingsSchedules={sanitizeProps(siblingsSchedules)}
      />
    </div>
  )
}
