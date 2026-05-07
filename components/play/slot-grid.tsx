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
  slotDurationMinutes: number
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SlotGrid({ courtId, pricePerSlot, depositPercentage, slots, slotDurationMinutes }: Props) {
  const router = useRouter()
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])
  const [duration, setDuration] = useState<number>(slotDurationMinutes === 30 ? 60 : slotDurationMinutes)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Durations to offer (in minutes)
  const durationOptions = slotDurationMinutes === 30 ? [60, 90, 120] : [slotDurationMinutes]
  const slotsNeeded = Math.max(1, Math.ceil(duration / slotDurationMinutes))

  const handleSelectSlot = (startIndex: number) => {
    // Check if enough consecutive slots are available
    const slice = slots.slice(startIndex, startIndex + slotsNeeded)
    if (slice.length === slotsNeeded && slice.every(s => s.available)) {
      setSelectedSlots(slice)
    } else {
      // Find the maximum available slots starting from this one
      setSelectedSlots([])
    }
  }

  const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0)
  const depositAmount = Math.round((totalPrice * depositPercentage) / 100)

  const onConfirm = () => {
    if (selectedSlots.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await createBooking({
        courtId,
        startTime: selectedSlots[0].start,
        endTime: selectedSlots[selectedSlots.length - 1].end,
        totalPrice,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/play/reserva/${res.bookingId}`)
    })
  }

  // Reset selection when duration changes
  const handleDurationChange = (val: string) => {
    setDuration(Number(val))
    setSelectedSlots([])
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
      {slotDurationMinutes === 30 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <span className="text-sm font-medium text-foreground">Duración del turno</span>
          <Select value={duration.toString()} onValueChange={handleDurationChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Duración" />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d >= 60 ? `${d / 60} hs` : `${d} min`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {slots.map((s, idx) => {
          const isSelected = selectedSlots.some(selected => selected.start === s.start)
          
          // Check if it's a valid start for the current duration
          const slice = slots.slice(idx, idx + slotsNeeded)
          const canStartHere = slice.length === slotsNeeded && slice.every(sl => sl.available)
          const disabled = !s.available || (!canStartHere && !isSelected)

          return (
            <button
              key={s.start}
              type="button"
              disabled={disabled || pending}
              onClick={() => handleSelectSlot(idx)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-lg border px-2 py-3 text-sm font-medium transition-colors",
                !s.available
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                  : isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : !canStartHere
                      ? "cursor-not-allowed opacity-50 border-border bg-card text-muted-foreground"
                      : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5",
              )}
            >
              <span className="block">{s.label}</span>
              {s.available && s.price !== pricePerSlot && (
                <span className={cn("block text-[10px] font-bold opacity-80 mt-0.5", isSelected ? "text-primary-foreground" : "text-primary")}>${s.price}</span>
              )}
            </button>
          )
        })}
      </div>

      {selectedSlots.length > 0 && (
        <div className="sticky bottom-16 z-20 rounded-xl border border-border bg-card p-4 shadow-lg md:bottom-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Turno seleccionado</p>
              <p className="text-base font-semibold text-foreground">{selectedSlots[0].label} a {selectedSlots[selectedSlots.length - 1].end.slice(11, 16)} hs</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-semibold text-foreground">${totalPrice.toLocaleString("es-AR")}</p>
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
