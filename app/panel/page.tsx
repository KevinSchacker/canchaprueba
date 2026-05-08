import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
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
} from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { EgresoButton } from "@/components/owner/egreso-button"

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

  // Stats del mes
  let monthRevenue = 0
  let monthBookings = 0
  let monthCancelled = 0
  let occupancyPct = 0
  let peakHour = "--"

  // Caja del día — con desglose por método
  let todayOnline = 0
  let todayPending = 0
  let todayCash = 0
  let todayMP = 0
  let todayTransfer = 0

  // Semana actual vs anterior (para gráfico de barras)
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

    // ─── Estadísticas del mes ───
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const { data: monthData } = await supabase
      .from("bookings")
      .select(
        `id, start_time, end_time, status, total_price, deposit_amount, deposit_paid, notes,
         courts!inner ( venue_id, slot_duration_minutes )`,
      )
      .eq("courts.venue_id", venue.id)
      .gte("start_time", firstOfMonth)
      .lte("start_time", endOfMonth)

    type MonthRow = {
      id: string
      start_time: string
      end_time: string
      status: string
      total_price: string | number
      deposit_amount: string | number
      deposit_paid: boolean
      notes: string | null
      courts: { venue_id: string; slot_duration_minutes: number }
    }
    const mList = (monthData ?? []) as unknown as MonthRow[]

    monthRevenue = mList
      .filter((b) => b.deposit_paid && b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.deposit_amount || 0), 0)

    monthBookings = mList.filter((b) => b.status !== "cancelled").length
    monthCancelled = mList.filter((b) => b.status === "cancelled").length

    // Hora pico
    const hourMap: Record<number, number> = {}
    mList
      .filter((b) => b.status !== "cancelled")
      .forEach((b) => {
        const h = new Date(b.start_time).getHours()
        hourMap[h] = (hourMap[h] || 0) + 1
      })
    const peakEntry = Object.entries(hourMap).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
    if (peakEntry) peakHour = `${String(peakEntry[0]).padStart(2, "0")}:00hs`

    // Ocupación
    if (courtsCount > 0 && monthBookings > 0) {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const avgSlotsPerCourtPerDay = 14
      const totalPossible = courtsCount * daysInMonth * avgSlotsPerCourtPerDay
      occupancyPct = totalPossible > 0 ? Math.min(100, Math.round((monthBookings / totalPossible) * 100)) : 0
    }

    // ─── Caja del día con desglose ───
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    const { data: todayData } = await supabase
      .from("bookings")
      .select(
        `id, start_time, status, total_price, deposit_amount, deposit_paid, notes,
         courts!inner ( venue_id )`,
      )
      .eq("courts.venue_id", venue.id)
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .in("status", ["pending", "confirmed", "completed"])

    type TodayRow = {
      id: string
      total_price: string | number
      deposit_amount: string | number
      deposit_paid: boolean
      status: string
      notes: string | null
    }
    const tList = (todayData ?? []) as unknown as TodayRow[]

    todayOnline = tList
      .filter((b) => b.deposit_paid)
      .reduce((sum, b) => sum + Number(b.deposit_amount || 0), 0)
    todayPending = tList
      .filter((b) => !b.deposit_paid)
      .reduce((sum, b) => sum + Number(b.total_price || 0), 0)

    // Desglose por método (basado en notas guardadas por CollectRemainingDialog)
    for (const b of tList) {
      if (b.notes?.includes("efectivo")) todayCash += Number(b.deposit_amount || 0)
      else if (b.notes?.includes("mercadopago")) todayMP += Number(b.deposit_amount || 0)
      else if (b.notes?.includes("transferencia")) todayTransfer += Number(b.deposit_amount || 0)
      else if (b.deposit_paid) todayOnline += 0 // ya sumado arriba
    }

    // ─── Gráfico semana actual vs anterior ───
    // Semana actual
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const { data: weekCurrent } = await supabase
      .from("bookings")
      .select("start_time, status, courts!inner(venue_id)")
      .eq("courts.venue_id", venue.id)
      .gte("start_time", monday.toISOString())
      .lte("start_time", sunday.toISOString())
      .neq("status", "cancelled")

    for (const b of (weekCurrent ?? [])) {
      const dow = (new Date(b.start_time).getDay() + 6) % 7 // 0=lun, 6=dom
      weekCurrentData[dow]++
    }

    // Semana anterior
    const prevMonday = new Date(monday)
    prevMonday.setDate(monday.getDate() - 7)
    const prevSunday = new Date(prevMonday)
    prevSunday.setDate(prevMonday.getDate() + 6)
    prevSunday.setHours(23, 59, 59, 999)

    const { data: weekPrev } = await supabase
      .from("bookings")
      .select("start_time, status, courts!inner(venue_id)")
      .eq("courts.venue_id", venue.id)
      .gte("start_time", prevMonday.toISOString())
      .lte("start_time", prevSunday.toISOString())
      .neq("status", "cancelled")

    for (const b of (weekPrev ?? [])) {
      const dow = (new Date(b.start_time).getDay() + 6) % 7
      weekPrevData[dow]++
    }
  }

  const monthName = new Date().toLocaleDateString("es-AR", { month: "long" })
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  const maxWeekVal = Math.max(...weekCurrentData, ...weekPrevData, 1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Inicio</h1>
          <p className="text-sm text-muted-foreground">Resumen de tu actividad en CanchAR.</p>
        </div>
        {/* ── Botón acción rápida: Nuevo Turno ── */}
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
          {/* Quick stats */}
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

          {/* ── Dashboard de estadísticas del mes ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Estadísticas de{" "}
                    <span className="capitalize">{monthName}</span>
                  </CardTitle>
                  <CardDescription>Datos del mes en curso.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Ingresos (señas)"
                  value={`$${monthRevenue.toLocaleString("es-AR")}`}
                  color="text-primary"
                />
                <MiniStat
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Ocupación"
                  value={`${occupancyPct}%`}
                  color="text-accent"
                />
                <MiniStat
                  icon={<Clock className="h-4 w-4" />}
                  label="Hora pico"
                  value={peakHour}
                  color="text-foreground"
                />
                <MiniStat
                  icon={<XCircle className="h-4 w-4" />}
                  label="Cancelaciones"
                  value={String(monthCancelled)}
                  color="text-destructive"
                />
              </div>

              {/* Barra de ocupación visual */}
              {monthBookings > 0 && (
                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{monthBookings} turnos confirmados este mes</span>
                    <span>{occupancyPct}% ocupación</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${Math.max(2, occupancyPct)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Gráfico de barras: semana actual vs anterior ── */}
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
                        {/* Barra semana anterior */}
                        <div
                          className="flex-1 rounded-t bg-border/60"
                          style={{ height: `${(prev / maxWeekVal) * 100}%`, minHeight: prev > 0 ? "4px" : "0" }}
                          title={`Semana anterior: ${prev} turnos`}
                        />
                        {/* Barra semana actual */}
                        <div
                          className="flex-1 rounded-t bg-primary"
                          style={{ height: `${(curr / maxWeekVal) * 100}%`, minHeight: curr > 0 ? "4px" : "0" }}
                          title={`Esta semana: ${curr} turnos`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Esta semana
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-border/80" /> Semana anterior
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ── Caja del día con desglose y egresos ── */}
          {(todayOnline > 0 || todayPending > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Caja de hoy</CardTitle>
                    <CardDescription>Resumen de cobros del día.</CardDescription>
                  </div>
                  {venue && <EgresoButton venueId={venue.id} />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col rounded-lg border border-border p-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Cobrado online (señas)
                    </span>
                    <span className="mt-1 text-lg font-bold text-primary">
                      ${todayOnline.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg border border-border p-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      A cobrar en cancha
                    </span>
                    <span className="mt-1 text-lg font-bold text-accent">
                      ${todayPending.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-lg border border-border p-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Total del día
                    </span>
                    <span className="mt-1 text-lg font-bold text-foreground">
                      ${(todayOnline + todayPending).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Desglose de métodos de pago */}
                {(todayCash > 0 || todayMP > 0 || todayTransfer > 0) && (
                  <div className="mt-4 rounded-lg bg-secondary/40 p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Desglose por método
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {todayCash > 0 && (
                        <span className="flex items-center gap-1 text-foreground">
                          💵 Efectivo <strong>${todayCash.toLocaleString("es-AR")}</strong>
                        </span>
                      )}
                      {todayMP > 0 && (
                        <span className="flex items-center gap-1 text-foreground">
                          📱 MercadoPago <strong>${todayMP.toLocaleString("es-AR")}</strong>
                        </span>
                      )}
                      {todayTransfer > 0 && (
                        <span className="flex items-center gap-1 text-foreground">
                          🏦 Transferencia <strong>${todayTransfer.toLocaleString("es-AR")}</strong>
                        </span>
                      )}
                    </div>
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

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`text-lg font-bold ${color}`}>{value}</span>
      </div>
    </div>
  )
}
