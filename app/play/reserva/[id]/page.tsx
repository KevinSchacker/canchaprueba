import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { BottomNav } from "@/components/play/bottom-nav"
import { PayDepositButton } from "@/components/play/pay-deposit-button"
import { SoftLockTimer } from "@/components/play/soft-lock-timer"

export const dynamic = "force-dynamic"

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, start_time, end_time, status, total_price, deposit_amount, deposit_paid, notes, created_at,
      courts!inner (
        id, name, slot_duration_minutes,
        venues!inner ( id, name, address, city, phone )
      )
    `,
    )
    .eq("id", id)
    .eq("player_id", user.id)
    .maybeSingle()

  type BookingFull = {
    id: string
    start_time: string
    end_time: string
    status: string
    total_price: string | number
    deposit_amount: string | number
    deposit_paid: boolean
    notes: string | null
    created_at: string
    courts: {
      id: string
      name: string
      slot_duration_minutes: number
      venues: { id: string; name: string; address: string; city: string; phone: string | null }
    }
  }
  const b = booking as unknown as BookingFull | null
  if (!b) notFound()

  const start = new Date(b.start_time)
  const end = new Date(b.end_time)
  const dateLabel = start.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")} - ${String(
    end.getHours(),
  ).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`

  const total = Number(b.total_price)
  const deposit = Number(b.deposit_amount)
  const remaining = total - deposit

  const isConfirmed = b.status === "confirmed" && b.deposit_paid

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/play"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <Logo showText={false} />
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {isConfirmed && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Reserva confirmada</h2>
              <p className="text-sm text-muted-foreground">Te esperamos con la cancha lista. Llegá 10 minutos antes.</p>
            </div>
          </div>
        )}

        <Card className="mb-5">
          <CardHeader>
            <CardDescription className="text-xs uppercase tracking-wide">Tu turno</CardDescription>
            <CardTitle className="text-xl">{b.courts.venues.name}</CardTitle>
            <CardDescription>{b.courts.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Row icon={<Calendar className="h-4 w-4 text-accent" />} label="Fecha" value={dateLabel} />
            <Row icon={<Clock className="h-4 w-4 text-accent" />} label="Horario" value={timeLabel} />
            <Row
              icon={<MapPin className="h-4 w-4 text-accent" />}
              label="Lugar"
              value={`${b.courts.venues.address}, ${b.courts.venues.city}`}
            />
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Detalle del pago</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total del turno</span>
              <span className="font-medium text-foreground">${total.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seña</span>
              <span className="font-medium text-foreground">${deposit.toLocaleString("es-AR")}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">A pagar en la cancha</span>
              <span className="font-semibold text-foreground">${remaining.toLocaleString("es-AR")}</span>
            </div>
          </CardContent>
        </Card>

        {!isConfirmed ? (
          <div className="sticky bottom-16 rounded-xl border border-border bg-card p-4 shadow-lg md:bottom-4">
            <SoftLockTimer createdAt={b.created_at} />
            <PayDepositButton bookingId={b.id} amount={deposit} />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Vas a recibir un recordatorio antes del turno.{" "}
            <Link href="/play/mis-reservas" className="font-medium text-primary underline-offset-4 hover:underline">
              Ver mis reservas
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}
