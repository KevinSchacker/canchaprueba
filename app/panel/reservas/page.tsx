import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CalendarCheck, Clock, MapPin, User } from "lucide-react"
import { BookingActions } from "@/components/owner/booking-actions"
import { createAdminClient } from "@/lib/supabase/admin"
import { RateBookingDialog } from "@/components/play/rate-booking-dialog"
import { WeeklyAgenda } from "@/components/owner/weekly-agenda"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente seña", color: "bg-accent/10 text-accent" },
  confirmed: { label: "Confirmada", color: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  completed: { label: "Completada", color: "bg-secondary text-secondary-foreground" },
  no_show: { label: "No se presentó", color: "bg-destructive/10 text-destructive" },
}

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const sp = await searchParams
  const view = sp.view === "agenda" ? "agenda" : "lista"

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
  const { data: bookings } = await adminDb
    .from("bookings")
    .select(
      `
      id, start_time, end_time, status, total_price, deposit_amount, deposit_paid, notes, player_id,
      courts!inner ( id, name, venue_id ),
      player:player_id ( full_name, phone )
    `,
    )
    .eq("courts.venue_id", venue.id)
    .order("start_time", { ascending: true })

  const playerIds = Array.from(new Set((bookings ?? []).map((b) => b.player_id)))
  const { data: playerReviewsData } = await adminDb
    .from("reviews")
    .select("player_id, rating, reviewer_id, booking_id")
    .eq("reviewee_type", "player")
    .in("player_id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"])

  const playerReviews = playerReviewsData ?? []

  // Calcular reputación por jugador
  const playerReputation: Record<string, { average: number; count: number }> = {}
  for (const pid of playerIds) {
    const revs = playerReviews.filter((r) => r.player_id === pid)
    if (revs.length > 0) {
      playerReputation[pid] = {
        average: revs.reduce((acc, r) => acc + r.rating, 0) / revs.length,
        count: revs.length,
      }
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
    player_id: string
    courts: { id: string; name: string; venue_id: string }
    player: any
  }
  const list = (bookings ?? []) as unknown as Row[]

  const upcoming = list.filter(
    (b) => new Date(b.start_time) >= new Date() && b.status !== "cancelled",
  )
  const past = list.filter(
    (b) => new Date(b.start_time) < new Date() || b.status === "cancelled",
  )

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
        <WeeklyAgenda bookings={list} />
      ) : (
        <div className="flex flex-col gap-8">
          <Section title="Próximas" items={upcoming} playerReputation={playerReputation} playerReviews={playerReviews} currentUserId={user!.id} />
          <Section title="Anteriores" items={past} muted playerReputation={playerReputation} playerReviews={playerReviews} currentUserId={user!.id} />
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
    player_id: string
    courts: { id: string; name: string }
    player: any
  }>
  muted?: boolean
  playerReputation: Record<string, { average: number; count: number }>
  playerReviews: Array<{ player_id: string; rating: number; reviewer_id: string; booking_id: string }>
  currentUserId: string
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
          const prof = Array.isArray(b.player) ? b.player[0] : b.player
          return (
            <li key={b.id}>
              <Card className={cn(muted && "opacity-80")}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                          <User className="h-4 w-4 text-accent" />
                          {prof?.full_name ?? "Jugador"}
                        </span>
                        {playerReputation[b.player_id] && (
                          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            ★ {playerReputation[b.player_id].average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {prof?.phone && (
                        <span className="text-xs text-muted-foreground">{prof.phone}</span>
                      )}
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
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
                      <MapPin className="h-3.5 w-3.5 text-accent" /> {b.courts.name}
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
                    <div className="flex gap-2">
                      <BookingActions bookingId={b.id} status={b.status} />
                      {b.status === "completed" && (() => {
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
