"use client"

import { useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { CalendarX } from "lucide-react"
import { releaseSeriesException } from "@/lib/owner/series-actions"
import { useRouter } from "next/navigation"

interface Props {
  seriesId: string
  dayOfWeek: number
  guestName: string
}

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

/** Devuelve la próxima fecha del día de semana dado */
function nextDateForDow(dow: number): string {
  const today = new Date()
  const diff = (dow - today.getDay() + 7) % 7
  const next = new Date(today)
  next.setDate(today.getDate() + (diff === 0 ? 7 : diff))
  return next.toISOString().slice(0, 10)
}

export function ReleaseExceptionButton({ seriesId, dayOfWeek, guestName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => nextDateForDow(dayOfWeek))
  const [reason, setReason] = useState("Feriado / aviso del cliente")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const onConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await releaseSeriesException(seriesId, date, reason)
      if (!res.ok) {
        setError(res.error ?? "Error al liberar el turno.")
        return
      }
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        router.refresh()
      }, 1500)
    })
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarX className="h-4 w-4 text-amber-500" />
          Liberar turno excepcional
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cancelá el turno de <strong className="text-foreground">{guestName}</strong> solo para una fecha
          específica, sin afectar el contrato fijo del resto del mes.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Fecha a liberar ({DAY_LABELS[dayOfWeek]})
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option>Feriado / aviso del cliente</option>
              <option>Lluvia / mal tiempo</option>
              <option>Mantenimiento de cancha</option>
              <option>Otro motivo</option>
            </select>
          </div>
        </div>

        <div className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          ⚡ El turno quedará libre en la agenda para ese día. El contrato fijo continúa normalmente el siguiente {DAY_LABELS[dayOfWeek]}.
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">✓ Turno liberado correctamente.</p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={pending} className="bg-amber-500 hover:bg-amber-600 text-white">
            {pending ? <><Spinner /> Liberando...</> : "Liberar este turno"}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
      >
        <CalendarX className="h-3.5 w-3.5" />
        Liberar semana
      </Button>
      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
