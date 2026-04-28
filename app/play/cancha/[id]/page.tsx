import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Sun, Lightbulb, Clock } from "lucide-react"
import { getAvailableSlots, nextDays, toDateKey } from "@/lib/booking/slots"
import { DateStrip } from "@/components/play/date-strip"
import { SlotGrid } from "@/components/play/slot-grid"
import { Logo } from "@/components/brand/logo"
import { BottomNav } from "@/components/play/bottom-nav"

export const dynamic = "force-dynamic"

export default async function CourtDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: court } = await supabase
    .from("courts")
    .select(
      `
      id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes, deposit_percentage, active,
      venues!inner ( id, name, address, city, phone, cover_image_url, active ),
      sports ( name )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  type CourtFull = {
    id: string
    name: string
    surface: string | null
    indoor: boolean
    has_lighting: boolean
    price_per_slot: string | number
    slot_duration_minutes: number
    deposit_percentage: number
    active: boolean
    venues: { id: string; name: string; address: string; city: string; phone: string | null; cover_image_url: string | null; active: boolean }
    sports: { name: string } | null
  }
  const c = court as unknown as CourtFull | null

  if (!c || !c.active || !c.venues?.active) notFound()

  const days = nextDays(14)
  const today = toDateKey(new Date())
  const date = sp.date && days.some((d) => d.key === sp.date) ? sp.date : today

  const slots = await getAvailableSlots(c.id, date)
  const price = Number(c.price_per_slot)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/play"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <Logo showText={false} />
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {/* Cover */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-border">
          <div className="relative h-48 w-full bg-secondary md:h-64">
            {c.venues.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.venues.cover_image_url || "/placeholder.svg"}
                alt={c.venues.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                <span className="text-base font-medium text-primary/60">{c.venues.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {c.venues.name}
          </h1>
          <p className="text-base text-muted-foreground">
            {c.sports?.name ?? "Pádel"} · {c.name}
          </p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>
              {c.venues.address}, {c.venues.city}
            </span>
          </div>
          {c.venues.phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>{c.venues.phone}</span>
            </div>
          )}
        </div>

        {/* Specs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {c.surface && (
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {c.surface}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            {c.indoor ? "Techada" : (
              <>
                <Sun className="h-3 w-3" /> Aire libre
              </>
            )}
          </span>
          {c.has_lighting && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              <Lightbulb className="h-3 w-3" /> Iluminación
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <Clock className="h-3 w-3" /> Turnos de {c.slot_duration_minutes} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            ${price.toLocaleString("es-AR")} por turno
          </span>
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Elegí día</h2>
        <div className="mb-5">
          <DateStrip days={days} selected={date} basePath={`/play/cancha/${c.id}`} />
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Horarios disponibles
        </h2>
        <SlotGrid
          courtId={c.id}
          pricePerSlot={price}
          depositPercentage={c.deposit_percentage}
          slots={slots}
        />
      </main>

      <BottomNav />
    </div>
  )
}
