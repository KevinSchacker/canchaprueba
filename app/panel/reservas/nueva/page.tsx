import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { QuickBookingForm } from "@/components/owner/quick-booking-form"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CalendarCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function NuevaReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; court?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase
    .from("venues")
    .select("id, name")
    .eq("owner_id", user!.id)
    .maybeSingle()

  if (!venue) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><CalendarCheck /></EmptyMedia>
          <EmptyTitle>Sin complejo configurado</EmptyTitle>
          <EmptyDescription>Primero cargá tu complejo y tus canchas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const adminDb = createAdminClient()
  const { data: courts } = await adminDb
    .from("courts")
    .select("id, name, price_per_slot, deposit_percentage, slot_duration_minutes")
    .eq("venue_id", venue.id)
    .eq("active", true)
    .order("name")

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Nuevo Turno</h1>
        <p className="text-sm text-muted-foreground">
          Registrá una reserva presencial o telefónica rápidamente.
        </p>
      </div>

      <QuickBookingForm
        courts={courts ?? []}
        defaultDate={sp.date}
        defaultTime={sp.time}
        defaultCourtId={sp.court}
      />
    </div>
  )
}
