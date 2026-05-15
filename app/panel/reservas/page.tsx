import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CalendarCheck, Clock, MapPin, User, AlertTriangle } from "lucide-react"
import { BookingActions } from "@/components/owner/booking-actions"
import { RateBookingDialog } from "@/components/play/rate-booking-dialog"
import { DailyAgenda } from "@/components/owner/daily-agenda"
import { WhatsAppLink } from "@/components/owner/whatsapp-link"
import { CollectRemainingDialog } from "@/components/owner/collect-remaining-dialog"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente seña", color: "bg-accent/10 text-accent" },
  confirmed: { label: "Confirmada", color: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  completed: { label: "Completada", color: "bg-secondary text-secondary-foreground" },
  no_show: { label: "No se presentó", color: "bg-destructive/10 text-destructive" },
}

const FILTER_LABELS: Record<string, string> = {
  all: "Todas",
  debt: "Con deuda",
  deposit: "Seña pagada",
  completed: "Completada",
  no_show: "No presentados",
}

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; filter?: string }>
}) {
  const sp = await searchParams
  const view = sp.view === "agenda" ? "agenda" : "lista"
  const activeFilter = sp.filter ?? "all"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()

  if (!venue) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarCheck />
          </EmptyMedia>
          <EmptyTitle>Sin complejo aún</EmptyTitle>
          <EmptyDescription>Cargá tu complejo para empezar a recibir reservas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const adminDb = createAdminClient()

  // 1. Canchas del complejo
  const { data: courts } = await adminDb.from("courts").select("id, name, active").eq("venue_id", venue.id)
  const courtIds = (courts ?? []).map((c) => c.id)

  // 2. Reservas de esas canchas (incluye guest_name/guest_phone para turnos presenciales)
  const { data: rawBookings } = courtIds.length > 0
    ? await adminDb
        .from("bookings")
        .select("id, start_time, end_time, status, total_price, deposit_amount, deposit_paid, notes, player_id, court_id, guest_name, guest_phone")
        .in("court_id", courtIds)
        .order("start_time", { ascending: true })
    : { data: [] as any[] }

  const bookingList = rawBookings ?? []

  // 3. Perfiles de jugadores (filtrando nulls)
  const playerIds = Array.from(
    new Set(
      bookingList
        .map((b: any) => b.player_id as string | null)
        .filter((id): id is string => id !== null && id !== undefined)
    )
  )

  const { data: playerProfiles } = playerIds.length > 0
    ? await adminDb.from("profiles").select("id, full_name, phone").in("id", playerIds)
    : { data: [] as any[] }

  const profileMap: Record<string, { full_name: string | null; phone: string | null }> = {}
  for (const p of (playerProfiles ?? [])) {
    profileMap[p.id] = { full_name: p.full_name, phone: p.phone }
  }

  // Emails como fallback
  const emailMap: Record<string, string> = {}
  if (playerIds.length > 0) {
    const { data: { users } } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (users ?? [])) {
      if (playerIds.includes(u.id)) emailMap[u.id] = u.email ?? ""
    }
  }

  const courtMap: Record<string, string> = {}
  for (const c of (courts ?? [])) courtMap[c.id] = c.name

  // 4. Reviews de jugadores
  const { data: playerReviewsData } = playerIds.length > 0
    ? await adminDb.from("reviews").select("player_id, rating, reviewer_id, booking_id").eq("reviewee_type", "player").in("player_id", playerIds)
    : { data: [] as any[] }
  const playerReviews = playerReviewsData ?? []

  // 5. Reputación por jugador
  const playerReputation: Record<string, { average: number; count: number }> = {}
  for (const pid of playerIds) {
    const revs = playerReviews.filter((r: any) => r.player_id === pid)
    if (revs.length > 0) {
      playerReputation[pid] = {
        average: revs.reduce((acc: number, r: any) => acc + r.rating, 0) / revs.length,
        count: revs.length,
      }
    }
  }

  // 6. CRM: contar no_shows por jugador
  const noShowCount: Record<string, number> = {}
  for (const b of bookingList) {
    if (b.status === "no_show" && b.player_id) {
      noShowCount[b.player_id] = (noShowCount[b.player_id] ?? 0) + 1
    }
  }

  type Row = {
    id: string
    start_time: string
    end_time: string
    status: string
    total_price: string | number
    deposit_amount: string | number
    deposit_paid: boolean
    notes: string | null
    player_id: string | null
    court_id: string
    guest_name: string | null
    guest_phone: string | null
    playerName: string
    playerPhone: string | null
    courtName: string
    /** true cuando fue creado por el dueño (sin player_id) */
    isPresencial: boolean
  }

  const list: Row[] = bookingList.map((b: any) => {
    const fromProfile = b.player_id ? profileMap[b.player_id] : null
    const playerName =
      fromProfile?.full_name ||
      (b.player_id ? emailMap[b.player_id] : null) ||
      b.guest_name ||
      "Sin nombre"
    const playerPhone = fromProfile?.phone ?? b.guest_phone ?? null
    return {
      ...b,
      playerName,
      playerPhone,
      courtName: courtMap[b.court_id] ?? "Cancha",
      isPresencial: !b.player_id,
    }
  })

  // Ordenar cronológicamente
  list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Separar en upcoming/past con lógica de "Turno en curso"
  const now = new Date()
  
  const upcoming = list.filter((b) => {
    const endTime = new Date(b.end_time)
    const isFinalStatus = ["cancelled", "completed", "no_show"].includes(b.status)
    // Si no terminó todavía Y no está cancelado/completado -> Es Próxima o En Curso
    return endTime > now && !isFinalStatus
  })

  const past = list.filter((b) => {
    const endTime = new Date(b.end_time)
    const isFinalStatus = ["cancelled", "completed", "no_show"].includes(b.status)
    // Si ya terminó O tiene un estado final -> Es Pasada
    return endTime <= now || isFinalStatus
  })
  
  // Past bookings: las más recientes arriba
  past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  // Marcar las que están ocurriendo ahora para darles prioridad
  const upcomingWithLive = upcoming.map(b => ({
    ...b,
    isLive: new Date(b.start_time) <= now && new Date(b.end_time) > now
  }))

  // Re-ordenar upcoming para que las "En Curso" (isLive) aparezcan arriba de todo
  upcomingWithLive.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1
    if (!a.isLive && b.isLive) return 1
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })

  // Aplicar filtro activo
  function applyFilter(items: Row[], f: string): Row[] {
    if (f === "debt") return items.filter((b) => !b.deposit_paid && b.status !== "cancelled")
    if (f === "deposit") return items.filter((b) => b.deposit_paid && b.status !== "completed")
    if (f === "completed") return items.filter((b) => b.status === "completed")
    if (f === "no_show") return items.filter((b) => b.status === "no_show")
    return items
  }

  const filteredUpcoming = applyFilter(upcomingWithLive as any, activeFilter)
  const filteredPast = applyFilter(past, activeFilter)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Reservas recibidas</h1>
        <p className="text-sm text-muted-foreground">Gestioná las reservas de tus canchas.</p>
      </div>

      {/* Tabs Lista / Agenda */}
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/30 p-1 w-fit">
        <a
          href="/panel/reservas"
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            view === "lista"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Lista
        </a>
        <a
          href="/panel/reservas?view=agenda"
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            view === "agenda"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Agenda diaria
        </a>
      </div>

      {/* Filtros rápidos (solo en vista lista) */}
      {view === "lista" && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <a
              key={key}
              href={`/panel/reservas?filter=${key}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeFilter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {label}
            </a>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarCheck />
            </EmptyMedia>
            <EmptyTitle>Sin reservas todavía</EmptyTitle>
            <EmptyDescription>Cuando un jugador reserve aparecerá acá.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === "agenda" ? (
        <DailyAgenda bookings={list as any} courts={courts ?? []} venueId={venue.id} />
      ) : (
        <div className="flex flex-col gap-10">
          <Section
            title="Próximas"
            items={filteredUpcoming}
            playerReputation={playerReputation}
            playerReviews={playerReviews}
            currentUserId={user!.id}
            noShowCount={noShowCount}
            groupByDate
          />
          <Section
            title="Anteriores"
            items={filteredPast}
            muted
            playerReputation={playerReputation}
            playerReviews={playerReviews}
            currentUserId={user!.id}
            noShowCount={noShowCount}
          />
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  items,
  muted = false,
  playerReputation,
  playerReviews,
  currentUserId,
  noShowCount,
  groupByDate = false,
}: {
  title: string
  items: any[]
  muted?: boolean
  playerReputation: Record<string, { average: number; count: number }>
  playerReviews: Array<{ player_id: string; rating: number; reviewer_id: string; booking_id: string }>
  currentUserId: string
  noShowCount: Record<string, number>
  groupByDate?: boolean
}) {
  if (items.length === 0) return null

  // Agrupar por fecha si se solicita
  const groups = groupByDate 
    ? items.reduce((acc, item) => {
        const dateKey = new Date(item.start_time).toISOString().split('T')[0]
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(item)
        return acc
      }, {} as Record<string, any[]>)
    : { [title]: items }

  return (
    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground/60 border-b pb-2">{title}</h2>
      
      <div className="flex flex-col gap-8">
        {Object.entries(groups).map(([dateKey, groupItems]) => {
          const date = new Date(dateKey + 'T12:00:00') // Usar mediodía para evitar problemas de zona horaria al formatear
          const isToday = new Date().toISOString().split('T')[0] === dateKey
          const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === dateKey
          
          const displayDate = groupByDate 
            ? (isToday ? "Hoy, " : isTomorrow ? "Mañana, " : "") + date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
            : null

          return (
            <div key={dateKey} className="flex flex-col gap-4">
              {displayDate && (
                <div className="flex items-center gap-4 px-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2 capitalize">
                    {displayDate}
                  </h3>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
              )}
              <ul className="flex flex-col gap-4">
                {(groupItems as any[]).map((b: any) => {
                  const start = new Date(b.start_time)
                  const end = new Date(b.end_time)
                  const dateLabel = start.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
                  const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}-${String(
                    end.getHours(),
                  ).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
                  const status = statusLabel[b.status] ?? statusLabel.pending
                  const playerNoShows = b.player_id ? (noShowCount[b.player_id] ?? 0) : 0
                  const isHighRisk = playerNoShows >= 2

                  return (
                    <li key={b.id}>
                      <Card className={cn(
                        "overflow-hidden transition-all border-l-4", 
                        muted 
                          ? "opacity-75 border-l-muted hover:opacity-100 shadow-none" 
                          : "border-l-primary shadow-sm hover:shadow-md"
                      )}>
                        <CardContent className="flex flex-col gap-3 p-4">
                          {/* Alerta CRM */}
                          {isHighRisk && (
                            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                ATENCIÓN: {playerNoShows} ausencias previas.
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-2 min-w-0 flex-1">
                              {/* Cancha Destacada con Estilo Badge */}
                              <div className="inline-flex items-center gap-1.5 w-fit rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/20">
                                <MapPin className="h-3 w-3" />
                                {b.courtName}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-lg font-bold text-foreground truncate">
                                  {b.playerName}
                                </span>
                                {/* Badge turno presencial vs app */}
                                {b.isPresencial ? (
                                  <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                    📍 Presencial
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-tight">
                                    📱 App
                                  </span>
                                )}
                                {b.player_id && playerReputation[b.player_id] && (
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    ★ {playerReputation[b.player_id].average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              
                              {b.playerPhone ? (
                                <WhatsAppLink
                                  phone={b.playerPhone}
                                  name={b.playerName}
                                  message={`Hola ${b.playerName}, te recordamos tu turno en ${b.courtName} el ${dateLabel} a las ${timeLabel.split("-")[0]}hs. ¡Te esperamos!`}
                                />
                              ) : null}
                            </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {b.isLive && (
                                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    EN CURSO
                                  </span>
                                )}
                                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border", status.color, status.color.includes("bg-primary") ? "border-primary/20" : "border-transparent")}>
                                  {status.label}
                                </span>
                              <div className="flex items-center gap-1.5 text-base font-black text-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
                                <Clock className="h-4 w-4 text-accent" />
                                {timeLabel}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 mt-1">
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Total:</span>
                                <span className="font-bold text-foreground text-sm">
                                  ${Number(b.total_price).toLocaleString("es-AR")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Seña:</span>
                                <span className="font-semibold text-foreground">
                                  ${Number(b.deposit_amount).toLocaleString("es-AR")}
                                </span>
                                {b.deposit_paid ? (
                                  <span className="text-primary font-black ml-1 text-[9px] bg-primary/10 px-1.5 py-0.5 rounded uppercase border border-primary/20">✓ PAGADA</span>
                                ) : (
                                  <span className="text-accent font-black ml-1 text-[9px] bg-accent/10 px-1.5 py-0.5 rounded uppercase border border-accent/20">PENDIENTE</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end">
                              <BookingActions bookingId={b.id} status={b.status} />
                              {b.deposit_paid && b.status === "confirmed" && (
                                <CollectRemainingDialog
                                  bookingId={b.id}
                                  totalPrice={Number(b.total_price)}
                                  depositAmount={Number(b.deposit_amount)}
                                  playerName={b.playerName}
                                />
                              )}
                              {b.status === "completed" && b.player_id && (() => {
                                const hasRated = playerReviews.some((r) => r.booking_id === b.id && r.reviewer_id === currentUserId)
                                if (hasRated) return <span className="inline-flex items-center px-3 py-1 text-[10px] font-bold text-muted-foreground bg-secondary rounded-md uppercase tracking-wider">✓ Calificado</span>
                                return <RateBookingDialog bookingId={b.id} revieweeType="player" revieweeId={b.player_id} title="Calificar jugador" />
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
