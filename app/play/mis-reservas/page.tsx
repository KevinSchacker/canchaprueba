import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { FullPCFooter } from "@/components/brand/fullpc-footer"
import { BottomNav } from "@/components/play/bottom-nav"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CancelBookingButton } from "@/components/play/cancel-booking-button"
import { RateBookingDialog } from "@/components/play/rate-booking-dialog"
import { cn } from "@/lib/utils"
import { CalendarCheck, Clock, MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente de seña", color: "bg-accent/10 text-accent" },
  confirmed: { label: "Confirmada", color: "bg-primary/10 text-primary" },
  cancelled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  completed: { label: "Jugada", color: "bg-secondary text-secondary-foreground" },
  no_show: { label: "No te presentaste", color: "bg-destructive/10 text-destructive" },
}

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id, start_time, end_time, status, total_price, deposit_amount, deposit_paid,
      courts!inner (
        id, name,
        venues!inner ( id, name, city )
      )
    `,
    )
    .eq("player_id", user.id)
    .order("start_time", { ascending: false })

  type Row = {
    id: string
    start_time: string
    end_time: string
    status: string
    total_price: string | number
    deposit_amount: string | number
    deposit_paid: boolean
    courts: { id: string; name: string; venues: { id: string; name: string; city: string } }
  }
  const list = (bookings ?? []) as unknown as Row[]

  const upcoming = list.filter(
    (b) => new Date(b.start_time) > new Date() && b.status !== "cancelled",
  )
  const past = list.filter(
    (b) => new Date(b.start_time) <= new Date() || b.status === "cancelled",
  )

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Mis reservas
        </h1>

        {list.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>No tenés reservas todavía</EmptyTitle>
              <EmptyDescription>Buscá una cancha y reservá tu primer turno.</EmptyDescription>
            </EmptyHeader>
            <Link
              href="/play"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Buscar canchas
            </Link>
          </Empty>
        ) : (
          <div className="flex flex-col gap-8">
            <Section title="Próximas" items={upcoming} canCancel />
            <Section title="Anteriores" items={past} muted />
          </div>
        )}
      </main>

      <FullPCFooter />
      <BottomNav />
    </div>
  )
}

function Section({
  title,
  items,
  canCancel = false,
  muted = false,
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
    courts: { id: string; name: string; venues: { id: string; name: string; city: string } }
  }>
  canCancel?: boolean
  muted?: boolean
}) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((b) => {
          const start = new Date(b.start_time)
          const end = new Date(b.end_time)
          const dateLabel = start.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
          const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}-${String(
            end.getHours(),
          ).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
          const status = statusLabel[b.status] ?? statusLabel.pending
          return (
            <li key={b.id}>
              <Card className={cn("flex flex-col gap-3 p-4", muted && "opacity-80")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <Link
                      href={`/play/reserva/${b.id}`}
                      className="text-base font-semibold text-foreground hover:underline"
                    >
                      {b.courts.venues.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">{b.courts.name}</span>
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
                    <MapPin className="h-3.5 w-3.5 text-accent" /> {b.courts.venues.city}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border mt-1">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      Total: ${Number(b.total_price).toLocaleString("es-AR")}
                    </span>
                    {Number(b.deposit_amount) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {b.deposit_paid ? "Seña pagada: " : "Seña pendiente: "}
                        ${Number(b.deposit_amount).toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                  {canCancel && b.status !== "cancelled" && <CancelBookingButton bookingId={b.id} />}
                  {b.status === "completed" && (
                    <RateBookingDialog 
                      bookingId={b.id} 
                      revieweeType="court" 
                      revieweeId={b.courts.id} 
                      title="Calificar cancha" 
                    />
                  )}
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
