import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeriesForm, type CourtOption } from "@/components/owner/series-form"

export const dynamic = "force-dynamic"

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    .order("name")

  const courtsList: CourtOption[] = (courts ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    pricePerSlot: Number(c.price_per_slot),
    slotDurationMinutes: c.slot_duration_minutes,
  }))

  const { data: series } = await supabase
    .from("booking_series")
    .select(
      `id, court_id, guest_name, guest_phone, day_of_week, start_time, duration_minutes,
       starts_on, status, price_per_slot, monthly_payment, notes,
       courts!inner ( venue_id )`,
    )
    .eq("id", id)
    .maybeSingle()

  type Row = {
    id: string
    court_id: string
    guest_name: string | null
    guest_phone: string | null
    day_of_week: number
    start_time: string
    duration_minutes: number
    starts_on: string
    status: "active" | "paused" | "cancelled"
    price_per_slot: string | number
    monthly_payment: boolean
    notes: string | null
    courts: { venue_id: string }
  }
  const s = series as unknown as Row | null
  if (!s || s.courts.venue_id !== venue.id) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/panel/fijos"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a turnos fijos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Editar turno fijo</h1>
        <p className="text-sm text-muted-foreground">
          Al guardar, regeneramos las próximas 8 semanas con la nueva configuración.
        </p>
      </div>
      <SeriesForm
        courts={courtsList}
        initial={{
          id: s.id,
          courtId: s.court_id,
          guestName: s.guest_name ?? "",
          guestPhone: s.guest_phone,
          dayOfWeek: s.day_of_week,
          startTime: s.start_time.slice(0, 5),
          durationMinutes: s.duration_minutes,
          startsOn: s.starts_on,
          pricePerSlot: Number(s.price_per_slot),
          monthlyPayment: s.monthly_payment,
          notes: s.notes,
        }}
      />
    </div>
  )
}
