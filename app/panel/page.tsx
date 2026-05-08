import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  CalendarCheck,
  CircleDot,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  XCircle,
  DollarSign,
  BarChart3,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react"
import Link from "next/link"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { EgresoButton } from "@/components/owner/egreso-button"
import { cn } from "@/lib/utils"

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
    guest_name: string | null
    courts: { name: string }
    profiles: { full_name: string | null } | null
  }> = []
  let pendingCount = 0

  // Stats del mes
  let monthRevenue = 0
  let monthBookings = 0
  let monthCancelled = 0
  let occupancyPct = 0
  let peakHour = "--"

  // Caja del día
  let todayIncome = 0      // total señas/depósitos cobrados hoy
  let todayPendingCash = 0 // turnos sin cobrar
  let todayEgresos = 0     // salidas de caja del día

  // Movimientos del día para el balance
  type Movement = {
    id: string
    type: "income" | "egreso"
    amount: number
    concept: string
    method: string | null
    created_at: string
  }
  let todayMovements: Movement[] = []

  // Semana actual vs anterior
  let weekCurrentData: number[] = Array(7).fill(0)
  let weekPrevData: number[] = Array(7).fill(0)

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
        `id, start_time, status, deposit_paid, guest_name,
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

    // ─── Estadísticas del mes ───
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: monthData } = await supabase
      .from("bookings")
      .select(
        `id, start_time, end_time, status, total_price, deposit_amount, deposit_paid,
         courts!inner ( venue_id, slot_duration_minutes )`,
      )
      .eq("courts.venue_id", venue.id)
      .gte("start_time", firstOfMonth)
      .lte("start_time", endOfMonth)

    type MonthRow = {
      id: string; start_time: string; status: string
      total_price: string | number; deposit_amount: string | number; deposit_paid: boolean
      courts: { venue_id: string; slot_duration_minutes: number }
    }
    const mList = (monthData ?? []) as unknown as MonthRow[]

    monthRevenue = mList
      .filter((b) => b.deposit_paid && b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.deposit_amount || 0), 0)
    monthBookings = mList.filter((b) => b.status !== "cancelled").length
    monthCancelled = mList.filter((b) => b.status === "cancelled").length

    const hourMap: Record<number, number> = {}
    mList.filter((b) => b.status !== "cancelled").forEach((b) => {
      const h = new Date(b.start_time).getHours()
      hourMap[h] = (hourMap[h] || 0) + 1
    })
    const peakEntry = Object.entries(hourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
    if (peakEntry) peakHour = `${String(peakEntry[0]).padStart(2, "0")}:00hs`

    if (courtsCount > 0 && monthBookings > 0) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const totalPossible = courtsCount * daysInMonth * 14
      occupancyPct = totalPossible > 0 ? Math.min(100, Math.round((monthBookings / totalPossible) * 100)) : 0
    }

    // ─── Caja del día ───
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    const { data: todayBookings } = await supabase
      .from("bookings")
      .select(`id, start_time, status, total_price, deposit_amount, deposit_paid, courts!inner(venue_id)`)
      .eq("courts.venue_id", venue.id)
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .in("status", ["pending", "confirmed", "completed"])

    type TodayRow = { total_price: string | number; deposit_amount: string | number; deposit_paid: boolean; status: string }
    const tList = (todayBookings ?? []) as unknown as TodayRow[]

    todayIncome = tList
      .filter((b) => b.deposit_paid)
      .reduce((sum, b) => sum + Number(b.deposit_amount || 0), 0)
    todayPendingCash = tList
      .filter((b) => !b.deposit_paid)
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0)

    // ─── Egresos del día ─── (tabla cash_movements)
    const { data: egresos } = await supabase
      .from("cash_movements")
      .select("id, type, amount, concept, method, created_at")
      .eq("venue_id", venue.id)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .order("created_at", { ascending: false })

    todayMovements = (egresos ?? []) as unknown as Movement[]
    todayEgresos = todayMovements
      .filter((m) => m.type === "egreso")
      .reduce((sum, m) => sum + m.amount, 0)

    // ─── Gráfico semana actual vs anterior ───
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)

    const { data: weekCurrent } = await supabase
      .from("bookings").select("start_time, courts!inner(venue_id)")
      .eq("courts.venue_id", venue.id).gte("start_time", monday.toISOString()).lte("start_time", sunday.toISOString()).neq("status", "cancelled")
    for (const b of (weekCurrent ?? [])) {
      weekCurrentData[(new Date(b.start_time).getDay() + 6) % 7]++
    }

    const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7)
    const prevSunday = new Date(prevMonday); prevSunday.setDate(prevMonday.getDate() + 6); prevSunday.setHours(23, 59, 59, 999)

    const { data: weekPrev } = await supabase
      .from("bookings").select("start_time, courts!inner(venue_id)")
      .eq("courts.venue_id", venue.id).gte("start_time", prevMonday.toISOString()).lte("start_time", prevSunday.toISOString()).neq("status", "cancelled")
    for (const b of (weekPrev ?? [])) {
      weekPrevData[(new Date(b.start_time).getDay() + 6) % 7]++
    }
  }

  const monthName = new Date().toLocaleDateString("es-AR", { month: "long" })
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  const maxWeekVal = Math.max(...weekCurrentData, ...weekPrevData, 1)

  // Caja neta del día
  const todayNet = todayIncome - todayEgresos

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Inicio</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad en CanchAR.</p>
        </div>
        <Link
          href="/panel/reservas/nueva"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo Turno
        </Link>
      </div>

      {!subscription && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle>Suscripción pendiente de activación</CardTitle>
            <CardDescription>
              El administrador activará tu suscripción para que puedas listar tus canchas. Mientras tanto podés cargar tu complejo y canchas, pero no serán visibles para los jugadores hasta la activación.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!venue ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>Empezá cargando tu complejo</EmptyTitle>
            <EmptyDescription>Configurá los datos de tu complejo y después dá de alta tus canchas con sus horarios.</EmptyDescription>
          </EmptyHeader>
          <Link href="/panel/complejo" className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Cargar mi complejo <ArrowRight className="h-4 w-4" />
          </Link>
        </Empty>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={<Building2 className="h-5 w-5" />} label="Complejo" value={venue.name} hint={venue.city} href="/panel/complejo" />
            <StatCard icon={<CircleDot className="h-5 w-5" />} label="Canchas activas" value={String(courtsCount)} hint={courtsCount === 0 ? "Sin canchas todavía" : "Gestionar"} href="/panel/canchas" />
            <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Reservas próximas" value={String(upcomingBookings.length)} hint={pendingCount > 0 ? `${pendingCount} sin seña` : "Todo en orden"} href="/panel/reservas" />
          </div>

          {/* ── Estadísticas del mes ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Estadísticas de <span className="capitalize">{monthName}</span></CardTitle>
                  <CardDescription>Datos del mes en curso.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat icon={<DollarSign className="h-4 w-4" />} label="Ingresos (señas)" value={`$${monthRevenue.toLocaleString("es-AR")}`} color="text-primary" />
                <MiniStat icon={<TrendingUp className="h-4 w-4" />} label="Ocupación" value={`${occupancyPct}%`} color="text-accent" />
                <MiniStat icon={<Clock className="h-4 w-4" />} label="Hora pico" value={peakHour} color="text-foreground" />
                <MiniStat icon={<XCircle className="h-4 w-4" />} label="Cancelaciones" value={String(monthCancelled)} color="text-destructive" />
              </div>
              {monthBookings > 0 && (
                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{monthBookings} turnos confirmados este mes</span>
                    <span>{occupancyPct}% ocupación</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${Math.max(2, occupancyPct)}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Gráfico barras semana actual vs anterior ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ocupación semanal</CardTitle>
              <CardDescription>Turnos por día: semana actual vs semana anterior.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-32 mt-2">
                {dayNames.map((day, i) => {
                  const curr = weekCurrentData[i]
                  const prev = weekPrevData[i]
                  return (
                    <div key={day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex gap-0.5 items-end w-full h-24">
                        <div className="flex-1 rounded-t bg-border/60" style={{ height: `${(prev / maxWeekVal) * 100}%`, minHeight: prev > 0 ? "4px" : "0" }} title={`Semana anterior: ${prev} turnos`} />
                        <div className="flex-1 rounded-t bg-primary" style={{ height: `${(curr / maxWeekVal) * 100}%`, minHeight: curr > 0 ? "4px" : "0" }} title={`Esta semana: ${curr} turnos`} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Esta semana</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-border/80" /> Semana anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* ── Caja del día — BALANCE COMPLETO ── */}
          {(todayIncome > 0 || todayPendingCash > 0 || todayMovements.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Caja de hoy</CardTitle>
                    <CardDescription>Balance de ingresos y egresos del día.</CardDescription>
                  </div>
                  <EgresoButton venueId={venue.id} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Resumen numérico */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ingresos cobrados</span>
                    <span className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      +${todayIncome.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Egresos</span>
                    <span className="mt-1 text-lg font-bold text-destructive">
                      -{todayEgresos > 0 ? `$${todayEgresos.toLocaleString("es-AR")}` : "$0"}
                    </span>
                  </div>
                  <div className={cn(
                    "flex flex-col rounded-lg border p-3",
                    todayNet >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
                  )}>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Caja neta del día</span>
                    <span className={cn("mt-1 text-lg font-bold", todayNet >= 0 ? "text-primary" : "text-destructive")}>
                      ${todayNet.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* A cobrar */}
                {todayPendingCash > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-accent/10 px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">A cobrar en cancha hoy</span>
                    <span className="font-semibold text-accent">${todayPendingCash.toLocaleString("es-AR")}</span>
                  </div>
                )}

                {/* ── Historial de movimientos del día ── */}
                {todayMovements.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Movimientos del día
                    </p>
                    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border overflow-hidden">
                      {todayMovements.map((m) => {
                        const time = new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                        const isEgreso = m.type === "egreso"
                        return (
                          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-card">
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full",
                                isEgreso ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {isEgreso
                                  ? <ArrowDownCircle className="h-3.5 w-3.5" />
                                  : <ArrowUpCircle className="h-3.5 w-3.5" />
                                }
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{m.concept}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {time}{m.method ? ` · ${m.method}` : ""}
                                </p>
                              </div>
                            </div>
                            <span className={cn("font-semibold", isEgreso ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                              {isEgreso ? "-" : "+"}${m.amount.toLocaleString("es-AR")}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Próximas reservas ── */}
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
                    // Nombre: perfil del jugador > guest_name > "Jugador"
                    const displayName = b.profiles?.full_name ?? b.guest_name ?? "Jugador"
                    const isPresencial = !b.profiles?.full_name && !!b.guest_name
                    return (
                      <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{displayName}</span>
                            {isPresencial && (
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                📍 Presencial
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground">{b.courts.name}</span>
                        </div>
                        <span className="text-muted-foreground">{date} · {time}hs</span>
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

function StatCard({ icon, label, value, hint, href }: { icon: React.ReactNode; label: string; value: string; hint: string; href: string }) {
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

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${color}`}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
      </div>
    </div>
  )
}
