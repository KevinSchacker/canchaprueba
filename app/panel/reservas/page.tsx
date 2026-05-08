import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CalendarCheck, Clock, MapPin, User, AlertTriangle } from "lucide-react"
import { BookingActions } from "@/components/owner/booking-actions"
import { RateBookingDialog } from "@/components/play/rate-booking-dialog"
import { WeeklyAgenda } from "@/components/owner/weekly-agenda"
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
  const { data: courts } = await adminDb.from("courts").select("id, name").eq("venue_id", venue.id)
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

  // Separar en upcoming/past
  const upcoming = list.filter((b) => new Date(b.start_time) >= new Date() && b.status !== "cancelled")
  const past = list.filter((b) => new Date(b.start_time) < new Date() || b.status === "cancelled")

  // Aplicar filtro activo
  function applyFilter(items: Row[], f: string): Row[] {
    if (f === "debt") return items.filter((b) => !b.deposit_paid && b.status !== "cancelled")
    if (f === "deposit") return items.filter((b) => b.deposit_paid && b.status !== "completed")
    if (f === "completed") return items.filter((b) => b.status === "completed")
    if (f === "no_show") return items.filter((b) => b.status === "no_show")
    return items
  }

  const filteredUpcoming = applyFilter(upcoming, activeFilter)
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
          Agenda semanal
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
        <WeeklyAgenda bookings={list as any} courts={courts ?? []} venueId={venue.id} />
      ) : (
        <div className="flex flex-col gap-8">
          <Section
            title="Próximas"
            items={filteredUpcoming}
            playerReputation={playerReputation}
            playerReviews={playerReviews}
            currentUserId={user!.id}
            noShowCount={noShowCount}
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
}: {
  title: string
  items: Array<{
    id: string
    start_time: string
    end_time: string
    status: string
    total_price: string | number
    deposit_amount: string | number
    deposit_paid: boolean
    player_id: string | null
    court_id: string
    playerName: string
    playerPhone: string | null
    courtName: string
    isPresencial: boolean
  }>
  muted?: boolean
  playerReputation: Record<string, { average: number; count: number }>
  playerReviews: Array<{ player_id: string; rating: number; reviewer_id: string; booking_id: string }>
  currentUserId: string
  noShowCount: Record<string, number>
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((b) => {
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
              <Card className={cn(muted && "opacity-80")}>
                <CardContent className="flex flex-col gap-3 p-4">
                  {/* Alerta CRM */}
                  {isHighRisk && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Este jugador tuvo <strong>{playerNoShows} ausencias</strong> anteriores. Exigir pago total por adelantado.
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                          <User className="h-4 w-4 text-accent" />
                          {b.playerName}
                        </span>
                        {/* Badge turno presencial vs app */}
                        {b.isPresencial ? (
                          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            📍 Presencial / telefónico
                          </span>
                        ) : (
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                            📱 App
                          </span>
                        )}
                        {b.player_id && playerReputation[b.player_id] && (
                          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            ★ {playerReputation[b.player_id].average.toFixed(1)}
                          </span>
                        )}
                        {isHighRisk && (
                          <span className="flex items-center gap-0.5 text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                            ⚠️ {playerNoShows} ausencias
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
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5 text-accent" /> {dateLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-accent" /> {timeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-accent" /> {b.courtName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>
                        Total{" "}
                        <span className="font-semibold text-foreground">
                          ${Number(b.total_price).toLocaleString("es-AR")}
                        </span>
                      </span>
                      <span>
                        Seña{" "}
                        <span className="font-medium text-foreground">
                          ${Number(b.deposit_amount).toLocaleString("es-AR")}
                        </span>{" "}
                        {b.deposit_paid ? (
                          <span className="text-primary">✓ Pagada</span>
                        ) : (
                          <span className="text-accent">· Pendiente</span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <BookingActions bookingId={b.id} status={b.status} />
                      {/* Botón Cobrar Restante: cuando la seña está pagada y no está completada/cancelada */}
                      {b.deposit_paid && b.status === "confirmed" && (
                        <CollectRemainingDialog
                          bookingId={b.id}
                          totalPrice={Number(b.total_price)}
                          depositAmount={Number(b.deposit_amount)}
                          playerName={b.playerName}
                        />
                      )}
                      {/* Solo mostrar calificación si es reserva desde la App (tiene player_id) */}
                      {b.status === "completed" && b.player_id && (() => {
                        const hasRated = playerReviews.some((r) => r.booking_id === b.id && r.reviewer_id === currentUserId)
                        if (hasRated) {
                          return (
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-muted-foreground bg-secondary rounded-md">
                              ✓ Calificado
                            </span>
                          )
                        }
                        return (
                          <RateBookingDialog
                            bookingId={b.id}
                            revieweeType="player"
                            revieweeId={b.player_id}
                            title="Calificar jugador"
                          />
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
