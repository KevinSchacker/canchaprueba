import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CalendarX, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { BlackoutForm } from "@/components/owner/blackout-form"
import { BlackoutDeleteButton } from "@/components/owner/blackout-delete-button"

export const dynamic = "force-dynamic"

export default async function CourtBlackoutsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()
  if (!venue) redirect("/panel/complejo")

  const { data: court } = await supabase
    .from("courts")
    .select("id, name, venue_id")
    .eq("id", id)
    .eq("venue_id", venue.id)
    .maybeSingle()
  if (!court) notFound()

  const nowIso = new Date().toISOString()

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("court_blackouts")
      .select("id, start_time, end_time, reason")
      .eq("court_id", id)
      .gte("end_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(50),
    supabase
      .from("court_blackouts")
      .select("id, start_time, end_time, reason")
      .eq("court_id", id)
      .lt("end_time", nowIso)
      .order("start_time", { ascending: false })
      .limit(20),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/panel/canchas/${id}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la cancha
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Bloqueos · {court.name}</h1>
        <p className="text-sm text-muted-foreground">
          Sacá del calendario un horario puntual por mantenimiento, feriado o evento privado. Los slots quedan no
          disponibles para los jugadores.
        </p>
      </div>

      <BlackoutForm courtId={id} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Próximos bloqueos</h2>
        {(upcoming?.length ?? 0) === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarX />
              </EmptyMedia>
              <EmptyTitle>Sin bloqueos próximos</EmptyTitle>
              <EmptyDescription>La cancha está disponible en todos sus horarios habituales.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming!.map((b) => (
              <BlackoutItem key={b.id} blackout={b as Blackout} />
            ))}
          </ul>
        )}
      </section>

      {(past?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pasados</h2>
          <ul className="flex flex-col gap-2">
            {past!.map((b) => (
              <BlackoutItem key={b.id} blackout={b as Blackout} muted />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

type Blackout = { id: string; start_time: string; end_time: string; reason: string | null }

function BlackoutItem({ blackout: b, muted = false }: { blackout: Blackout; muted?: boolean }) {
  const start = new Date(b.start_time)
  const end = new Date(b.end_time)
  const dateLabel = start.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
  const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}-${String(
    end.getHours(),
  ).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
  return (
    <li>
      <Card className={muted ? "opacity-70" : ""}>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CalendarX className="h-4 w-4 text-accent" /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {timeLabel}
              {b.reason && <span className="ml-2">· {b.reason}</span>}
            </span>
          </div>
          {!muted && <BlackoutDeleteButton id={b.id} />}
        </CardContent>
      </Card>
    </li>
  )
}
