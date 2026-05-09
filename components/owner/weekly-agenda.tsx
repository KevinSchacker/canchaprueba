"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, User, BanknoteIcon, Plus } from "lucide-react"

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7hs a 22hs
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

type BookingSlot = {
  id: string
  start_time: string
  end_time: string
  status: string
  total_price: string | number
  deposit_amount?: string | number
  deposit_paid: boolean
  player_id?: string | null
  court_id?: string
  guest_name?: string | null
  // Estructura nueva (flat)
  courtName?: string
  playerName?: string
  playerPhone?: string | null
  isPresencial?: boolean
  // Estructura vieja (join), por retrocompatibilidad
  courts?: { id: string; name: string }
  profiles?: { full_name: string | null; phone: string | null } | null
}

interface Props {
  bookings: BookingSlot[]
  /** Lista de canchas disponibles para crear turno rápido al hacer clic en celda vacía */
  courts?: { id: string; name: string }[]
  venueId?: string
}

/**
 * Semántica de colores:
 * - verde  → confirmada con seña pagada (o completada)
 * - naranja → confirmada sin seña / pendiente de seña
 * - rojo   → no_show
 * - gris   → cancelada
 */
function getStatusColors(status: string, depositPaid: boolean) {
  if (status === "cancelled") {
    return { bg: "bg-muted/50", border: "border-border", text: "text-muted-foreground" }
  }
  if (status === "no_show") {
    return { bg: "bg-destructive/15", border: "border-destructive/50", text: "text-destructive" }
  }
  if (status === "completed" || (status === "confirmed" && depositPaid)) {
    return { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400" }
  }
  // pending o confirmed sin seña → naranja
  return { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400" }
}

/** Devuelve los 7 días de la semana a partir del lunes de la semana dada */
function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor)
  const dow = d.getDay() // 0=sun
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return x
  })
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function WeeklyAgenda({ bookings, courts = [], venueId }: Props) {
  const router = useRouter()
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState<BookingSlot | null>(null)

  const weekDays = getWeekDays(anchor)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[6]

  const prevWeek = () => {
    const d = new Date(anchor)
    d.setDate(d.getDate() - 7)
    setAnchor(d)
  }
  const nextWeek = () => {
    const d = new Date(anchor)
    d.setDate(d.getDate() + 7)
    setAnchor(d)
  }

  // Filtrar reservas de la semana visible
  const weekBookings = bookings.filter((b) => {
    const d = dateKey(new Date(b.start_time))
    return d >= dateKey(weekStart) && d <= dateKey(weekEnd)
  })

  // Calcular top/height en % dentro del rango 7–23hs (960 min)
  const RANGE_START = 7 * 60
  const RANGE_TOTAL = 16 * 60 // 7hs a 23hs

  const toPercent = (minutes: number) => ((minutes - RANGE_START) / RANGE_TOTAL) * 100

  const monthLabel = weekStart.toLocaleDateString("es-AR", { month: "long", year: "numeric" })

  /** Abre el formulario de nueva reserva precompletado */
  const handleEmptyCellClick = (day: Date, hour: number, courtId?: string) => {
    const dateStr = day.toISOString().slice(0, 10)
    const timeStr = `${String(hour).padStart(2, "0")}:00`
    const params = new URLSearchParams({
      date: dateStr,
      time: timeStr,
      ...(courtId ? { court: courtId } : {}),
    })
    router.push(`/panel/reservas/nueva?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header de navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize text-foreground">{monthLabel}</span>
        <button
          onClick={nextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-3 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60 border border-emerald-500/50" />
          Confirmada / Pagada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/60 border border-amber-500/50" />
          Pendiente de seña
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-destructive/60 border border-destructive/50" />
          No se presentó
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted border border-border" />
          Cancelada
        </span>
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[640px]">
          {/* Cabecera de días */}
          <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div className="border-b border-r border-border" />
            {weekDays.map((day, i) => {
              const isToday = dateKey(day) === dateKey(new Date())
              return (
                <div
                  key={i}
                  className={cn(
                    "border-b border-r border-border px-1 py-2 text-center last:border-r-0",
                    isToday && "bg-primary/5",
                  )}
                >
                  <p className={cn("text-[11px] font-medium uppercase text-muted-foreground", isToday && "text-primary")}>
                    {DAY_SHORT[i === 6 ? 0 : i + 1] /* Lun-Dom */}
                  </p>
                  <p className={cn("text-sm font-semibold text-foreground", isToday && "text-primary")}>
                    {day.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Cuerpo con horas */}
          <div className="relative grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            {/* Columna de horas */}
            <div className="flex flex-col">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex h-10 items-start justify-end border-r border-b border-border pr-2 pt-0.5"
                >
                  <span className="text-[10px] text-muted-foreground">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {weekDays.map((day, colIdx) => {
              const isToday = dateKey(day) === dateKey(new Date())
              const dayBookings = weekBookings.filter((b) => dateKey(new Date(b.start_time)) === dateKey(day))
              
              // Número de canchas para dividir la columna
              const courtCount = courts.length || 1
              const courtWidth = 100 / courtCount

              return (
                <div
                  key={colIdx}
                  className={cn(
                    "relative border-r border-border last:border-r-0",
                    isToday && "bg-primary/[0.03]",
                  )}
                  style={{ height: `${HOURS.length * 40}px` }}
                >
                  {/* Líneas de horas + zonas clickeables vacías divididas por cancha */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-border/40 flex"
                      style={{ top: `${((h - 7) / HOURS.length) * 100}%`, height: `${100 / HOURS.length}%` }}
                    >
                      {courts.map((court) => {
                        const hasBookingAtHourAndCourt = dayBookings.some((b) => {
                          const bh = new Date(b.start_time).getHours()
                          const bcid = b.court_id ?? (b as any).courts?.id
                          return bh === h && bcid === court.id
                        })

                        return (
                          <div
                            key={court.id}
                            className={cn(
                              "h-full flex-1 border-r border-border/20 last:border-r-0 transition-colors group",
                              !hasBookingAtHourAndCourt ? "cursor-pointer hover:bg-primary/10" : "bg-secondary/5"
                            )}
                            onClick={() => {
                              if (!hasBookingAtHourAndCourt) {
                                handleEmptyCellClick(day, h, court.id)
                              }
                            }}
                            title={!hasBookingAtHourAndCourt ? `Reservar ${court.name} - ${h}:00hs` : undefined}
                          >
                            {!hasBookingAtHourAndCourt && (
                              <div className="hidden group-hover:flex h-full w-full items-center justify-center">
                                <Plus className="h-3 w-3 text-primary/40" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Bloques de reservas posicionados por cancha */}
                  {dayBookings.map((b) => {
                    const start = new Date(b.start_time)
                    const end = new Date(b.end_time)
                    const startMin = start.getHours() * 60 + start.getMinutes()
                    const endMin = end.getHours() * 60 + end.getMinutes()
                    const topPct = toPercent(Math.max(startMin, RANGE_START))
                    const heightPct = toPercent(Math.min(endMin, RANGE_START + RANGE_TOTAL)) - topPct
                    if (heightPct <= 0) return null

                    const courtId = b.court_id ?? (b as any).courts?.id
                    const courtIndex = courts.findIndex(c => c.id === courtId)
                    const actualIndex = courtIndex === -1 ? 0 : courtIndex
                    const leftPos = actualIndex * courtWidth
                    
                    const colors = getStatusColors(b.status, b.deposit_paid)
                    const timeLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`

                    return (
                      <button
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(selected?.id === b.id ? null : b)
                        }}
                        className={cn(
                          "absolute rounded-md border px-1.5 py-0.5 text-left transition-all hover:ring-2 hover:ring-primary/20 z-10 shadow-sm",
                          colors.bg,
                          colors.border,
                        )}
                        style={{ 
                          top: `${topPct}%`, 
                          height: `${heightPct}%`, 
                          left: `${leftPos}%`, 
                          width: `${courtWidth - 1}%`,
                          minHeight: "24px" 
                        }}
                      >
                        <p className={cn("truncate text-[9px] font-bold leading-tight", colors.text)}>
                          {(b.playerName ?? b.profiles?.full_name ?? b.guest_name ?? "Jugador").split(" ")[0]}
                        </p>
                        {courtCount === 1 && (
                          <p className="truncate text-[8px] text-muted-foreground/80">{timeLabel} · {b.courtName ?? (b as any).courts?.name}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Panel de detalle de reserva seleccionada */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-accent" />
                {selected.playerName ?? selected.profiles?.full_name ?? "Jugador"}
              </p>
              {(selected.playerPhone ?? selected.profiles?.phone) && (
                <p className="ml-5.5 text-xs text-muted-foreground">{selected.playerPhone ?? selected.profiles?.phone}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar ×
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              {new Date(selected.start_time).toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
              {" · "}
              {String(new Date(selected.start_time).getHours()).padStart(2, "0")}:
              {String(new Date(selected.start_time).getMinutes()).padStart(2, "0")}
              {" – "}
              {String(new Date(selected.end_time).getHours()).padStart(2, "0")}:
              {String(new Date(selected.end_time).getMinutes()).padStart(2, "0")}
            </span>
            <span className="font-medium text-foreground">{selected.courtName ?? selected.courts?.name ?? "Cancha"}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <BanknoteIcon className="h-3.5 w-3.5" />
              Total:{" "}
              <strong className="text-foreground">
                ${Number(selected.total_price).toLocaleString("es-AR")}
              </strong>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                selected.deposit_paid
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              )}
            >
              {selected.deposit_paid ? "Seña pagada" : "Seña pendiente"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
