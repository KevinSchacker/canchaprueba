import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Calendar, Users, CreditCard } from "lucide-react"

export default async function AdminHome() {
  const supabase = await createClient()

  const [
    { count: playersCount },
    { count: ownersCount },
    { count: venuesCount },
    { count: bookingsCount },
    { data: activeSubs },
    { data: trialSubs },
    { data: pastDueSubs },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "owner"),
    supabase.from("venues").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("owner_subscriptions").select("monthly_price").eq("status", "active"),
    supabase.from("owner_subscriptions").select("id").eq("status", "trial"),
    supabase.from("owner_subscriptions").select("id").eq("status", "past_due"),
  ])

  const mrr = (activeSubs ?? []).reduce((sum, s: any) => sum + Number(s.monthly_price ?? 0), 0)

  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, start_time, status, total_price, courts(name, venues(name))")
    .order("created_at", { ascending: false })
    .limit(8)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumen general</h1>
        <p className="text-sm text-muted-foreground">Visión global de la plataforma.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jugadores" value={playersCount ?? 0} icon={<Users className="size-4" />} />
        <StatCard label="Dueños" value={ownersCount ?? 0} icon={<Users className="size-4" />} />
        <StatCard label="Complejos" value={venuesCount ?? 0} icon={<Building2 className="size-4" />} />
        <StatCard label="Reservas totales" value={bookingsCount ?? 0} icon={<Calendar className="size-4" />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              Ingreso mensual recurrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">${mrr.toLocaleString("es-AR")}</div>
            <p className="text-xs text-muted-foreground">Suma de suscripciones activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Owners en prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{trialSubs?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Período de prueba</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pagos atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-destructive">{pastDueSubs?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservas recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentBookings || recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay reservas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentBookings.map((b: any) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {b.courts?.venues?.name ?? "—"} <span className="text-muted-foreground">·</span>{" "}
                      {b.courts?.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.start_time).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{b.status}</Badge>
                    <span className="font-medium">${Number(b.total_price).toLocaleString("es-AR")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value.toLocaleString("es-AR")}</div>
        </div>
        <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">{icon}</div>
      </CardContent>
    </Card>
  )
}
