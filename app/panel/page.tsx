import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CalendarCheck, CircleDot, ArrowRight, Sparkles } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

export default async function PanelHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, city, active")
    .eq("owner_id", user!.id)
    .order("created_at")
    .limit(1)
    .maybeSingle()

  const { data: subscription } = await supabase
    .from("owner_subscriptions")
    .select("status, plan, trial_ends_at, current_period_end")
    .eq("owner_id", user!.id)
    .maybeSingle()

  let courtsCount = 0
  let upcomingBookings: Array<{
    id: string
    start_time: string
    courts: { name: string }
    profiles: { full_name: string | null } | null
  }> = []
  let pendingCount = 0

  if (venue) {
    const { count } = await supabase
      .from("courts")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venue.id)
    courtsCount = count ?? 0

    const nowIso = new Date().toISOString()
    const { data: bookings } = await supabase
      .from("bookings")
      .select(
        `id, start_time, status, deposit_paid,
         courts!inner ( name, venue_id ),
         profiles!bookings_player_id_fkey ( full_name )`,
      )
      .eq("courts.venue_id", venue.id)
      .gte("start_time", nowIso)
      .in("status", ["pending", "confirmed"])
      .order("start_time", { ascending: true })
      .limit(5)
    upcomingBookings = (bookings ?? []) as unknown as typeof upcomingBookings

    const { count: pc } = await supabase
      .from("bookings")
      .select("id, courts!inner(venue_id)", { count: "exact", head: true })
      .eq("courts.venue_id", venue.id)
      .eq("status", "pending")
    pendingCount = pc ?? 0
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu actividad en CanchAR.</p>
      </div>

      {!subscription && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle>Suscripción pendiente de activación</CardTitle>
            <CardDescription>
              El administrador activará tu suscripción para que puedas listar tus canchas. Mientras tanto podés cargar
              tu complejo y canchas, pero no serán visibles para los jugadores hasta la activación.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!venue ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Empezá cargando tu complejo</EmptyTitle>
            <EmptyDescription>
              Configurá los datos de tu complejo y después dá de alta tus canchas con sus horarios.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href="/panel/complejo"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Cargar mi complejo <ArrowRight className="h-4 w-4" />
          </Link>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              icon={<Building2 className="h-5 w-5" />}
              label="Complejo"
              value={venue.name}
              hint={venue.city}
              href="/panel/complejo"
            />
            <StatCard
              icon={<CircleDot className="h-5 w-5" />}
              label="Canchas activas"
              value={String(courtsCount)}
              hint={courtsCount === 0 ? "Sin canchas todavía" : "Gestionar"}
              href="/panel/canchas"
            />
            <StatCard
              icon={<CalendarCheck className="h-5 w-5" />}
              label="Reservas próximas"
              value={String(upcomingBookings.length)}
              hint={pendingCount > 0 ? `${pendingCount} sin seña` : "Todo en orden"}
              href="/panel/reservas"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas reservas</CardTitle>
              <CardDescription>Las próximas 5 reservas activas en tus canchas.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay reservas próximas.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingBookings.map((b) => {
                    const start = new Date(b.start_time)
                    const date = start.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
                    const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
                    return (
                      <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{b.profiles?.full_name ?? "Jugador"}</span>
                          <span className="text-muted-foreground">{b.courts.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {date} · {time}hs
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  href: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-xl font-semibold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
