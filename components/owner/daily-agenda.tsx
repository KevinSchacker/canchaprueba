"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, User, BanknoteIcon, Plus, Calendar as CalendarIcon } from "lucide-react"

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 7hs a 22hs

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
  courtName?: string
  playerName?: string
  playerPhone?: string | null
  isPresencial?: boolean
  courts?: { id: string; name: string }
  profiles?: { full_name: string | null; phone: string | null } | null
}

interface Props {
  bookings: BookingSlot[]
  courts?: { id: string; name: string; active?: boolean }[]
  venueId?: string
}

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
  return { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400" }
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function DailyAgenda({ bookings, courts = [], venueId }: Props) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selected, setSelected] = useState<BookingSlot | null>(null)

  const prevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }
  const nextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }
  const goToday = () => {
    setCurrentDate(new Date())
  }

  const dayBookings = bookings.filter((b) => dateKey(new Date(b.start_time)) === dateKey(currentDate))

  const RANGE_START = 7 * 60
  const RANGE_TOTAL = 16 * 60

  const toPercent = (minutes: number) => ((minutes - RANGE_START) / RANGE_TOTAL) * 100

  const dayLabel = currentDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
  const isToday = dateKey(currentDate) === dateKey(new Date())

  const handleEmptyCellClick = (hour: number, courtId?: string) => {
    const dateStr = dateKey(currentDate)
    const timeStr = `${String(hour).padStart(2, "0")}:00`
    const params = new URLSearchParams({
      date: dateStr,
      time: timeStr,
      ...(courtId ? { court: courtId } : {}),
    })
    router.push(`/panel/reservas/nueva?${params.toString()}`)
  }

  // Calculate widths
  const courtCount = courts.length || 1
  const courtWidth = 100 / courtCount

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevDay}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className={cn(
              "flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
              isToday ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
            )}
          >
            Hoy
          </button>
          <button
            onClick={nextDay}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-lg font-bold capitalize text-foreground">{dayLabel}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500/60 border border-emerald-500/50" />
          Confirmada / Pagada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-500/60 border border-amber-500/50" />
          Pendiente de seña
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-destructive/60 border border-destructive/50" />
          No se presentó
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[640px]">
          {/* Header Courts */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="w-[60px] shrink-0 border-r border-border" />
            <div className="flex flex-1">
              {courts.map((court) => (
                <div 
                  key={court.id} 
                  className={cn(
                    "flex-1 border-r border-border/50 py-3 px-2 text-center last:border-r-0",
                    court.active === false && "opacity-50"
                  )}
                  style={{ width: `${courtWidth}%` }}
                >
                  <p className="text-sm font-bold text-foreground truncate" title={court.name}>
                    {court.name}
                  </p>
                  {court.active === false && <p className="text-[10px] text-muted-foreground uppercase">Cerrada</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Body Hours & Columns */}
          <div className="flex relative" style={{ height: `${HOURS.length * 60}px` }}>
            {/* Hours scale */}
            <div className="w-[60px] shrink-0 border-r border-border flex flex-col relative bg-muted/10">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full flex justify-center text-xs font-medium text-muted-foreground"
                  style={{ top: `${((h - 7) / HOURS.length) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Grid Cells & Bookings Area */}
            <div className="flex-1 relative">
              {/* Horizontal Lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-b border-border/40"
                  style={{ top: `${((h - 7) / HOURS.length) * 100}%`, height: '1px' }}
                />
              ))}

              {/* Court Vertical Columns */}
              <div className="absolute inset-0 flex">
                {courts.map((court) => {
                  const isClosed = court.active === false
                  return (
                    <div 
                      key={court.id} 
                      className={cn(
                        "h-full flex-1 border-r border-border/20 last:border-r-0 relative",
                        isClosed && "bg-muted/10 pointer-events-none"
                      )}
                      style={{ 
                        backgroundImage: isClosed ? "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)" : undefined
                      }}
                    >
                      {/* Clickable cells for new bookings */}
                      {!isClosed && HOURS.map(h => {
                        // Check if there is an overlapping booking to hide the click zone or change its appearance
                        const hasBooking = dayBookings.some((b) => {
                          const bcid = b.court_id ?? (b as any).courts?.id
                          if (bcid !== court.id) return false
                          const bStart = new Date(b.start_time).getHours()
                          const bEnd = new Date(b.end_time).getHours()
                          return h >= bStart && h < bEnd
                        })
                        
                        return (
                          <div
                            key={h}
                            className="absolute w-full group cursor-pointer"
                            style={{ 
                              top: `${((h - 7) / HOURS.length) * 100}%`, 
                              height: `${100 / HOURS.length}%` 
                            }}
                            onClick={() => {
                              if (!hasBooking) handleEmptyCellClick(h, court.id)
                            }}
                          >
                            {!hasBooking && (
                              <div className="hidden group-hover:flex h-full w-full items-center justify-center bg-primary/5">
                                <Plus className="h-5 w-5 text-primary/40" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Bookings */}
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
                const endTimeLabel = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`

                return (
                  <button
                    key={b.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(selected?.id === b.id ? null : b)
                    }}
                    className={cn(
                      "absolute rounded-md border p-2 text-left transition-all hover:ring-2 hover:ring-primary/20 z-10 shadow-sm flex flex-col gap-1 overflow-hidden",
                      colors.bg,
                      colors.border,
                    )}
                    style={{ 
                      top: `${topPct}%`, 
                      height: `${heightPct}%`, 
                      left: `${leftPos}%`, 
                      width: `${courtWidth}%`,
                      marginLeft: "2px",
                      maxWidth: `calc(${courtWidth}% - 4px)`
                    }}
                  >
                    <div className="flex justify-between w-full items-start">
                      <p className={cn("truncate text-xs font-bold leading-tight", colors.text)}>
                        {b.playerName ?? b.profiles?.full_name ?? b.guest_name ?? "Jugador"}
                      </p>
                      {b.isPresencial && (
                        <span className="text-[9px] bg-background/50 px-1 rounded text-muted-foreground uppercase">Manual</span>
                      )}
                    </div>
                    <p className="truncate text-[10px] font-medium text-muted-foreground/80">
                      {timeLabel} - {endTimeLabel}
                    </p>
                    {(b.playerPhone || b.profiles?.phone) && heightPct > 10 && (
                      <p className="truncate text-[10px] text-muted-foreground/60">
                        {b.playerPhone ?? b.profiles?.phone}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Detail */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-accent" />
                {selected.playerName ?? selected.profiles?.full_name ?? "Jugador"}
                {selected.isPresencial && (
                  <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                    Presencial
                  </span>
                )}
              </p>
              {(selected.playerPhone ?? selected.profiles?.phone) && (
                <p className="ml-5.5 text-xs text-muted-foreground">{selected.playerPhone ?? selected.profiles?.phone}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground border px-2 py-1 rounded-md"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {new Date(selected.start_time).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
            </span>
            <span className="font-medium text-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
              {String(new Date(selected.start_time).getHours()).padStart(2, "0")}:{String(new Date(selected.start_time).getMinutes()).padStart(2, "0")} hs
              {" - "}
              {String(new Date(selected.end_time).getHours()).padStart(2, "0")}:{String(new Date(selected.end_time).getMinutes()).padStart(2, "0")} hs
            </span>
            <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {selected.courtName ?? selected.courts?.name ?? "Cancha"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs border-t pt-3 border-border/50">
            <span className="flex items-center gap-1 text-muted-foreground">
              <BanknoteIcon className="h-3.5 w-3.5" />
              Total:{" "}
              <strong className="text-foreground text-sm">
                ${Number(selected.total_price).toLocaleString("es-AR")}
              </strong>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[10px]",
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
