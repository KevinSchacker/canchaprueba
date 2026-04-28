"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { createBooking } from "@/lib/booking/actions"
import { useRouter } from "next/navigation"
import type { Slot } from "@/lib/booking/slots"

interface Props {
  courtId: string
  pricePerSlot: number
  depositPercentage: number
  slots: Slot[]
}

export function SlotGrid({ courtId, pricePerSlot, depositPercentage, slots }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const depositAmount = Math.round((pricePerSlot * depositPercentage) / 100)

  const onConfirm = () => {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const res = await createBooking({
        courtId,
        startTime: selected.start,
        endTime: selected.end,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/play/reserva/${res.bookingId}`)
    })
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          La cancha no tiene horarios definidos para este día.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {slots.map((s) => {
          const isSelected = selected?.start === s.start
          return (
            <button
              key={s.start}
              type="button"
              disabled={!s.available || pending}
              onClick={() => setSelected(s)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-lg border px-2 py-3 text-sm font-medium transition-colors",
                !s.available
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                  : isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="sticky bottom-16 z-20 rounded-xl border border-border bg-card p-4 shadow-lg md:bottom-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Turno seleccionado</p>
              <p className="text-base font-semibold text-foreground">{selected.label} hs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-semibold text-foreground">${pricePerSlot.toLocaleString("es-AR")}</p>
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
            <span className="text-muted-foreground">Seña a pagar ahora</span>
            <span className="font-semibold text-foreground">${depositAmount.toLocaleString("es-AR")}</span>
          </div>
          {error && (
            <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button onClick={onConfirm} disabled={pending} className="w-full" size="lg">
            {pending ? (
              <>
                <Spinner /> Reservando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
