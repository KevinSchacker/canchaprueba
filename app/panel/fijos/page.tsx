import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Repeat, Plus, User, Edit3, Calendar, Clock, Banknote, CheckCircle2, AlertCircle } from "lucide-react"
import { SeriesStatusButtons } from "@/components/owner/series-status-buttons"
import { WhatsAppLink } from "@/components/owner/whatsapp-link"
import { ReleaseExceptionButton } from "@/components/owner/release-exception-button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-primary/10 text-primary" },
  paused: { label: "Pausado", className: "bg-accent/10 text-accent" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
}

export default async function FixedSeriesPage() {
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
            <Repeat />
          </EmptyMedia>
          <EmptyTitle>Sin complejo aún</EmptyTitle>
          <EmptyDescription>Cargá tu complejo y al menos una cancha para poder crear turnos fijos.</EmptyDescription>
        </EmptyHeader>
        <Button asChild className="mt-2">
          <Link href="/panel/complejo">Ir al complejo</Link>
        </Button>
      </Empty>
    )
  }

  const { data: courts } = await supabase.from("courts").select("id").eq("venue_id", venue.id)
  const courtIds = (courts ?? []).map((c) => c.id)

  if (courtIds.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Repeat />
          </EmptyMedia>
          <EmptyTitle>Cargá una cancha primero</EmptyTitle>
          <EmptyDescription>Necesitás al menos una cancha para crear turnos fijos.</EmptyDescription>
        </EmptyHeader>
        <Button asChild className="mt-2">
          <Link href="/panel/canchas/nueva">Crear cancha</Link>
        </Button>
      </Empty>
    )
  }

  const { data: series } = await supabase
    .from("booking_series")
    .select(
      `id, court_id, guest_name, guest_phone, day_of_week, start_time, duration_minutes,
       starts_on, ends_on, status, price_per_slot, monthly_payment, paid_until, notes,
       courts!inner ( id, name )`,
    )
    .in("court_id", courtIds)
    .order("status")
    .order("day_of_week")
    .order("start_time")

  type Row = {
    id: string
    court_id: string
    guest_name: string | null
    guest_phone: string | null
    day_of_week: number
    start_time: string
    duration_minutes: number
    starts_on: string
    ends_on: string | null
    status: "active" | "paused" | "cancelled"
    price_per_slot: string | number
    monthly_payment: boolean
    paid_until: string | null
    notes: string | null
    courts: { id: string; name: string }
  }
  const list = (series ?? []) as unknown as Row[]

  // Calcular estado de pago del mes actual para cada serie
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Turnos fijos</h1>
          <p className="text-sm text-muted-foreground">
            Clientes que tienen un horario reservado todas las semanas. El cobro se acuerda con el dueño.
          </p>
        </div>
        <Button asChild>
          <Link href="/panel/fijos/nuevo">
            <Plus className="h-4 w-4" /> Nuevo turno fijo
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Repeat />
            </EmptyMedia>
            <EmptyTitle>Aún no tenés turnos fijos</EmptyTitle>
            <EmptyDescription>
              Sumá a tus clientes habituales para reservarles automáticamente las próximas 8 semanas.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-2">
            <Link href="/panel/fijos/nuevo">Crear el primero</Link>
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((s) => {
            const status = statusBadge[s.status] ?? statusBadge.active
            const startLabel = s.start_time.slice(0, 5)
            const endMin =
              Number(startLabel.split(":")[0]) * 60 + Number(startLabel.split(":")[1]) + s.duration_minutes
            const endHH = String(Math.floor(endMin / 60) % 24).padStart(2, "0")
            const endMM = String(endMin % 60).padStart(2, "0")

            // Estado de pago del mes
            const paidUntilDate = s.paid_until ? new Date(s.paid_until) : null
            const paidThisMonth = paidUntilDate ? paidUntilDate >= currentMonthEnd : false
            const paidUntilLabel = paidUntilDate
              ? paidUntilDate.toLocaleDateString("es-AR", { month: "short", year: "numeric" })
              : null

            return (
              <li key={s.id}>
                <Card className={cn(s.status !== "active" && "opacity-80")}>
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                          <User className="h-4 w-4 text-accent" />
                          {s.guest_name ?? "Cliente"}
                        </span>
                        {s.guest_phone ? (
                          <WhatsAppLink
                            phone={s.guest_phone}
                            name={s.guest_name ?? "Cliente"}
                            message={`Hola ${s.guest_name ?? ""},  te recordamos tu turno fijo de los ${DAY_LABELS[s.day_of_week]} a las ${startLabel}hs en ${s.courts.name}. ¡Te esperamos!`}
                          />
                        ) : null}
                      </div>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", status.className)}>
                        {status.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-accent" /> {DAY_LABELS[s.day_of_week]}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-accent" /> {startLabel}-{endHH}:{endMM}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3.5 w-3.5 text-accent" /> {s.courts.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex flex-col text-xs text-muted-foreground gap-1">
                        <span className="inline-flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="font-semibold text-foreground">
                            ${Number(s.price_per_slot).toLocaleString("es-AR")}
                          </span>{" "}
                          / turno
                        </span>

                        {/* ── Control de pago del mes ── */}
                        {s.monthly_payment ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium",
                            paidThisMonth
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            {paidThisMonth ? (
                              <><CheckCircle2 className="h-3 w-3" /> Mes pagado{paidUntilLabel ? ` hasta ${paidUntilLabel}` : ""}</>
                            ) : (
                              <><AlertCircle className="h-3 w-3" /> Pago del mes pendiente</>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Cobro por turno (cancha a cancha)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Liberar turno excepcional */}
                        {s.status === "active" && (
                          <ReleaseExceptionButton
                            seriesId={s.id}
                            dayOfWeek={s.day_of_week}
                            guestName={s.guest_name ?? "Cliente"}
                          />
                        )}
                        <SeriesStatusButtons seriesId={s.id} status={s.status} />
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/panel/fijos/${s.id}`}>
                            <Edit3 className="h-3.5 w-3.5" /> Editar
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {s.notes && (
                      <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                        {s.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
