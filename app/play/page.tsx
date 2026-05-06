import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { SearchFilters } from "@/components/play/search-filters"
import { CourtCard } from "@/components/play/court-card"
import { ClosestCourt } from "@/components/play/closest-court"
import { FullPCFooter } from "@/components/brand/fullpc-footer"
import { BottomNav } from "@/components/play/bottom-nav"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; city?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role === "owner") redirect("/panel")
  if (profile?.role === "admin") redirect("/admin")

  // Cargar deportes
  const { data: sportsData } = await supabase.from("sports").select("id, slug, name, active").order("name")
  const sports = sportsData ?? []
  const sportSlug = params.sport ?? sports.find((s) => s.active)?.slug ?? "padel"
  const selectedSport = sports.find((s) => s.slug === sportSlug)

  // Cargar canchas filtradas
  let courtsQuery = supabase
    .from("courts")
    .select(
      `
      id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes,
      venues!inner ( id, name, city, cover_image_url, active, owner_id, latitude, longitude )
    `,
    )
    .eq("active", true)

  if (selectedSport) {
    courtsQuery = courtsQuery.eq("sport_id", selectedSport.id)
  }
  if (params.city) {
    courtsQuery = courtsQuery.ilike("venues.city", `%${params.city}%`)
  }

  const { data: courtsData } = await courtsQuery

  type CourtRow = {
    id: string
    name: string
    surface: string | null
    indoor: boolean
    has_lighting: boolean
    price_per_slot: string | number
    slot_duration_minutes: number
    venues: { id: string; name: string; city: string; cover_image_url: string | null; active: boolean; owner_id: string; latitude: number | null; longitude: number | null }
  }

  // Cargar dueños con suscripción ACTIVA
  const { data: activeSubs } = await supabase
    .from("owner_subscriptions")
    .select("owner_id")
    .eq("status", "active")

  const activeOwnerIds = new Set((activeSubs ?? []).map((s) => s.owner_id))

  const courts = ((courtsData ?? []) as unknown as CourtRow[]).filter((c) => c.venues?.active && activeOwnerIds.has(c.venues.owner_id))

  // Ciudades sugeridas (top distintas)
  const { data: venuesData } = await supabase
    .from("venues")
    .select("city")
    .eq("active", true)
    .eq("province", "Misiones")
  const cities = Array.from(new Set((venuesData ?? []).map((v) => v.city))).slice(0, 8)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 flex flex-col gap-1">
          <p className="flex items-center gap-1 text-xs font-medium text-accent">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Misiones, Argentina
          </p>
          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
            Hola{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. ¿Dónde jugamos hoy?
          </h1>
        </div>

        <div className="mb-6">
          <SearchFilters sports={sports} cities={cities} />
        </div>

        {courts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>Todavía no hay canchas disponibles</EmptyTitle>
              <EmptyDescription>
                {params.city
                  ? `No encontramos canchas en "${params.city}". Probá con otra ciudad.`
                  : "Estamos sumando los primeros complejos de Misiones a la plataforma. Volvé pronto."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <p className="text-xs text-muted-foreground">
                ¿Tenés un complejo? Convertite en dueño desde tu cuenta para listar tus canchas.
              </p>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <ClosestCourt courts={courts.map(c => ({
              id: c.id,
              name: c.name,
              surface: c.surface,
              indoor: c.indoor,
              hasLighting: c.has_lighting,
              pricePerSlot: Number(c.price_per_slot),
              slotDurationMinutes: c.slot_duration_minutes,
              venues: c.venues
            }))} />

            <ul className="grid gap-4 sm:grid-cols-2">
              {courts.map((c) => (
                <li key={c.id}>
                  <CourtCard
                    id={c.id}
                  venueName={c.venues.name}
                  courtName={c.name}
                  city={c.venues.city}
                  surface={c.surface}
                  indoor={c.indoor}
                  hasLighting={c.has_lighting}
                  pricePerSlot={Number(c.price_per_slot)}
                  slotDurationMinutes={c.slot_duration_minutes}
                  coverImageUrl={c.venues.cover_image_url}
                />
              </li>
            ))}
          </ul>
          </>
        )}
      </main>

      <FullPCFooter />
      <BottomNav />
    </div>
  )
}
