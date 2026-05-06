import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Sun, Lightbulb, Clock, Users, Info, ShieldAlert } from "lucide-react"
import { getAvailableSlots, nextDays, toDateKey } from "@/lib/booking/slots"
import { DateStrip } from "@/components/play/date-strip"
import { SlotGrid } from "@/components/play/slot-grid"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Logo } from "@/components/brand/logo"
import { FullPCFooter } from "@/components/brand/fullpc-footer"
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
      description, max_players, cancellation_hours_before, cancellation_refund_pct, price_rules,
      venues!inner ( id, name, address, city, phone, cover_image_url, active, owner_id ),
      sports ( name ),
      court_images ( url, position )
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
    description: string | null
    max_players: number
    cancellation_hours_before: number
    cancellation_refund_pct: number
    price_rules: any
    venues: { id: string; name: string; address: string; city: string; phone: string | null; cover_image_url: string | null; active: boolean; owner_id: string }
    sports: { name: string } | null
    court_images: { url: string; position: number }[]
  }
  const c = court as unknown as CourtFull | null

  if (!c || !c.active || !c.venues?.active) notFound()

  const { data: sub } = await supabase
    .from("owner_subscriptions")
    .select("status")
    .eq("owner_id", c.venues.owner_id)
    .maybeSingle()

  if (!sub || sub.status !== "active") {
    notFound()
  }

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
        {/* Cover / Carousel */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-border">
          {c.court_images && c.court_images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {c.court_images.sort((a, b) => a.position - b.position).map((img, i) => (
                  <CarouselItem key={i}>
                    <div className="relative h-48 w-full bg-secondary md:h-64">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Cancha ${c.name} - Foto ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {c.court_images.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          ) : (
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
          )}
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
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <Users className="h-3 w-3" /> Máx {c.max_players || 4} jug.
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Desde ${price.toLocaleString("es-AR")}
          </span>
        </div>

        {/* Políticas y Descripción */}
        <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-4 text-sm shadow-sm md:grid-cols-2">
          {c.description && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-4 w-4 text-primary" /> Información
              </span>
              <p className="text-muted-foreground whitespace-pre-line">{c.description}</p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Política de cancelación
            </span>
            <p className="text-muted-foreground">
              Hasta {c.cancellation_hours_before}hs antes del turno. <br />
              Reembolso: {c.cancellation_refund_pct}% de la seña.
            </p>
          </div>
          {c.price_rules && (c.price_rules.night?.price || c.price_rules.weekend?.price) && (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sun className="h-4 w-4 text-accent" /> Precios dinámicos
              </span>
              <ul className="text-muted-foreground list-inside list-disc">
                {c.price_rules.night?.price && (
                  <li>Noche ({c.price_rules.night.from} a {c.price_rules.night.to}): ${Number(c.price_rules.night.price).toLocaleString("es-AR")}</li>
                )}
                {c.price_rules.weekend?.price && (
                  <li>Fines de semana: ${Number(c.price_rules.weekend.price).toLocaleString("es-AR")}</li>
                )}
              </ul>
            </div>
          )}
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
          slotDurationMinutes={c.slot_duration_minutes}
        />
      </main>

      <FullPCFooter />
      <BottomNav />
    </div>
  )
}
