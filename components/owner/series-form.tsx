"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { upsertSeries, deleteSeries } from "@/lib/owner/series-actions"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export type CourtOption = {
  id: string
  name: string
  pricePerSlot: number
  slotDurationMinutes: number
}

export type SeriesInitial = {
  id: string
  courtId: string
  guestName: string
  guestPhone: string | null
  dayOfWeek: number
  startTime: string // HH:mm
  durationMinutes: number
  startsOn: string // YYYY-MM-DD
  pricePerSlot: number
  monthlyPayment: boolean
  notes: string | null
} | null

interface Props {
  courts: CourtOption[]
  initial: SeriesInitial
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function SeriesForm({ courts, initial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [courtId, setCourtId] = useState(initial?.courtId ?? courts[0]?.id ?? "")
  const selectedCourt = useMemo(() => courts.find((c) => c.id === courtId) ?? courts[0], [courts, courtId])

  const [guestName, setGuestName] = useState(initial?.guestName ?? "")
  const [guestPhone, setGuestPhone] = useState(initial?.guestPhone ?? "")
  const [dayOfWeek, setDayOfWeek] = useState<number>(initial?.dayOfWeek ?? 1)
  const [startTime, setStartTime] = useState(initial?.startTime ?? "19:00")
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initial?.durationMinutes ?? selectedCourt?.slotDurationMinutes ?? 60,
  )
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? todayKey())
  const [pricePerSlot, setPricePerSlot] = useState<number>(
    initial?.pricePerSlot ?? selectedCourt?.pricePerSlot ?? 8000,
  )
  const [monthlyPayment, setMonthlyPayment] = useState(initial?.monthlyPayment ?? true)
  const [notes, setNotes] = useState(initial?.notes ?? "")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!courtId) {
      setError("Necesitás tener al menos una cancha cargada.")
      return
    }
    if (!guestName.trim()) {
      setError("Cargá el nombre del cliente del turno fijo.")
      return
    }
    startTransition(async () => {
      const res = await upsertSeries({
        id: initial?.id,
        courtId,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        dayOfWeek,
        startTime,
        durationMinutes,
        startsOn,
        pricePerSlot: Number(pricePerSlot),
        monthlyPayment,
        notes: notes.trim(),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push("/panel/fijos")
      router.refresh()
    })
  }

  const onDelete = () => {
    if (!initial) return
    if (!confirm("Eliminar este turno fijo y todas sus reservas futuras?")) return
    startDeleting(async () => {
      const res = await deleteSeries(initial.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push("/panel/fijos")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="court">Cancha</FieldLabel>
              <select
                id="court"
                value={courtId}
                onChange={(e) => {
                  const id = e.target.value
                  setCourtId(id)
                  const c = courts.find((x) => x.id === id)
                  if (c) {
                    setPricePerSlot(c.pricePerSlot)
                    setDurationMinutes(c.slotDurationMinutes)
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel>Día de la semana</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => {
                  const active = dayOfWeek === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDayOfWeek(i)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{DAY_SHORT[i]}</span>
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="start">Hora de inicio</FieldLabel>
                <Input id="start" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="duration">Duración (min)</FieldLabel>
                <Input
                  id="duration"
                  type="number"
                  min={30}
                  step={15}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="startsOn">Empieza el</FieldLabel>
                <Input
                  id="startsOn"
                  type="date"
                  required
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
                <FieldDescription>Se generan las próximas 8 semanas automáticamente.</FieldDescription>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="price">Precio por turno (ARS)</FieldLabel>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  required
                  value={pricePerSlot}
                  onChange={(e) => setPricePerSlot(Number(e.target.value))}
                />
              </Field>
              <Field orientation="horizontal">
                <input
                  id="monthly"
                  type="checkbox"
                  checked={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <FieldLabel htmlFor="monthly">Cobro mensual (en cancha o transferencia)</FieldLabel>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="guestName">Nombre del cliente</FieldLabel>
                <Input
                  id="guestName"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ej: Mateo Ferreyra"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="guestPhone">Teléfono (opcional)</FieldLabel>
                <Input
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+54 376..."
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notas internas (opcional)</FieldLabel>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: paga el primer lunes del mes"
              />
            </Field>
          </FieldGroup>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              {initial && (
                <Button type="button" variant="outline" onClick={onDelete} disabled={deleting || pending}>
                  {deleting ? <Spinner /> : "Eliminar turno fijo"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Spinner /> Guardando...
                  </>
                ) : initial ? (
                  "Guardar cambios"
                ) : (
                  "Crear turno fijo"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
