"use client"

import { useEffect, useState } from "react"
import { Timer, AlertTriangle } from "lucide-react"

const SOFT_LOCK_MINUTES = 10

interface SoftLockTimerProps {
  createdAt: string // ISO
}

export function SoftLockTimer({ createdAt }: SoftLockTimerProps) {
  const deadline = new Date(createdAt).getTime() + SOFT_LOCK_MINUTES * 60 * 1000

  const getRemainingMs = () => Math.max(0, deadline - Date.now())

  const [remainingMs, setRemainingMs] = useState(getRemainingMs)

  useEffect(() => {
    if (remainingMs <= 0) return
    const interval = setInterval(() => {
      const ms = getRemainingMs()
      setRemainingMs(ms)
      if (ms <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const isExpired = remainingMs === 0
  const isUrgent = remainingMs < 2 * 60 * 1000 // últimos 2 min

  const progress = Math.min(100, (remainingMs / (SOFT_LOCK_MINUTES * 60 * 1000)) * 100)

  if (isExpired) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm animate-pulse">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-destructive">El tiempo de reserva expiró</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Tu turno puede haberse liberado. Intentá pagar de todas formas; si el turno sigue disponible, se confirmará.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm transition-colors ${
        isUrgent
          ? "border-orange-400/40 bg-orange-500/5"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Timer className={`h-4 w-4 ${isUrgent ? "text-orange-500" : "text-primary"}`} />
          <span className={`font-semibold ${isUrgent ? "text-orange-500" : "text-primary"}`}>
            Turno reservado temporalmente
          </span>
        </div>
        <span
          className={`font-mono text-lg font-bold tabular-nums ${
            isUrgent ? "text-orange-500" : "text-primary"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent ? "bg-orange-500" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Pagá la seña en este tiempo para asegurar tu turno. Si expira, el sistema puede liberarlo automáticamente.
      </p>
    </div>
  )
}
