import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CircleDot, Plus, Sun, Lightbulb, Clock, Edit3, CalendarX } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CourtsListPage() {
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
            <CircleDot />
          </EmptyMedia>
          <EmptyTitle>Primero cargá tu complejo</EmptyTitle>
          <EmptyDescription>Necesitás un complejo antes de dar de alta canchas.</EmptyDescription>
        </EmptyHeader>
        <Button asChild className="mt-2">
          <Link href="/panel/complejo">Ir al complejo</Link>
        </Button>
      </Empty>
    )
  }

  const { data: courts } = await supabase
    .from("courts")
    .select("id, name, surface, indoor, has_lighting, price_per_slot, slot_duration_minutes, active, sports(name)")
    .eq("venue_id", venue.id)
    .order("created_at")

  type Row = {
    id: string
    name: string
    surface: string | null
    indoor: boolean
    has_lighting: boolean
    price_per_slot: string | number
    slot_duration_minutes: number
    active: boolean
    sports: { name: string } | null
  }
  const list = (courts ?? []) as unknown as Row[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Mis canchas</h1>
          <p className="text-sm text-muted-foreground">Gestioná tus canchas, precios y horarios.</p>
        </div>
        <Button asChild>
          <Link href="/panel/canchas/nueva">
            <Plus className="h-4 w-4" /> Nueva cancha
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleDot />
            </EmptyMedia>
            <EmptyTitle>Todavía no tenés canchas</EmptyTitle>
            <EmptyDescription>Dá de alta tu primera cancha y configurale los horarios.</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="mt-2">
            <Link href="/panel/canchas/nueva">Crear cancha</Link>
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-foreground">{c.name}</span>
                      <span className="text-sm text-muted-foreground">{c.sports?.name ?? "Pádel"}</span>
                    </div>
                    <span
                      className={
                        c.active
                          ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {c.active ? "Activa" : "Pausada"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.surface && (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{c.surface}</span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                      {c.indoor ? "Techada" : <><Sun className="h-3 w-3" /> Aire libre</>}
                    </span>
                    {c.has_lighting && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                        <Lightbulb className="h-3 w-3" /> Luz
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
                      <Clock className="h-3 w-3" /> {c.slot_duration_minutes}'
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold text-foreground">
                      ${Number(c.price_per_slot).toLocaleString("es-AR")} / turno
                    </span>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/panel/canchas/${c.id}/bloqueos`}>
                          <CalendarX className="h-3.5 w-3.5" /> Bloqueos
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/panel/canchas/${c.id}`}>
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
