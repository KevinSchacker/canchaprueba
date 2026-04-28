import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeriesForm, type CourtOption } from "@/components/owner/series-form"

export const dynamic = "force-dynamic"

export default async function NewSeriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()
  if (!venue) redirect("/panel/complejo")

  const { data: courts } = await supabase
    .from("courts")
    .select("id, name, price_per_slot, slot_duration_minutes")
    .eq("venue_id", venue.id)
    .eq("active", true)
    .order("name")

  const list: CourtOption[] = (courts ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    pricePerSlot: Number(c.price_per_slot),
    slotDurationMinutes: c.slot_duration_minutes,
  }))

  if (list.length === 0) redirect("/panel/canchas")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/fijos"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a turnos fijos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Nuevo turno fijo</h1>
        <p className="text-sm text-muted-foreground">
          Cargá un cliente que tiene un turno reservado semanalmente. Generamos las próximas 8 semanas.
        </p>
      </div>
      <SeriesForm courts={list} initial={null} />
    </div>
  )
}
