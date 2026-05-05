"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { upsertCourt, type CourtScheduleInput } from "@/lib/owner/actions"
import {
  ScheduleEditor,
  buildDefaultSchedules,
  buildSchedulesFromInitial,
  type DaySchedule,
} from "@/components/owner/schedule-editor"
import { cn } from "@/lib/utils"

type SportOption = { id: string; slug: string; name: string; active: boolean }

export type CourtInitial = {
  id: string
  name: string
  surface: string | null
  indoor: boolean
  hasLighting: boolean
  pricePerSlot: number
  slotDurationMinutes: number
  depositPercentage: number
  active: boolean
  sportSlug: string
  schedules: CourtScheduleInput[]
} | null

interface Props {
  venueId: string
  sports: SportOption[]
  initial: CourtInitial
}

export function CourtForm({ venueId, sports, initial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const activeSports = sports.filter((s) => s.active)
  const [sportSlug, setSportSlug] = useState(initial?.sportSlug ?? activeSports[0]?.slug ?? "padel")
  const [name, setName] = useState(initial?.name ?? "Cancha 1")
  const [surface, setSurface] = useState(initial?.surface ?? "Césped sintético")
  const [indoor, setIndoor] = useState(initial?.indoor ?? false)
  const [hasLighting, setHasLighting] = useState(initial?.hasLighting ?? true)
  const [pricePerSlot, setPricePerSlot] = useState(initial?.pricePerSlot ?? 8000)
  const [slotDuration, setSlotDuration] = useState(initial?.slotDurationMinutes ?? 30)
  const [depositPct, setDepositPct] = useState(initial?.depositPercentage ?? 30)
  const [active, setActive] = useState(initial?.active ?? true)
  const [days, setDays] = useState<DaySchedule[]>(
    initial ? buildSchedulesFromInitial(initial.schedules) : buildDefaultSchedules(),
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const schedules: CourtScheduleInput[] = days
      .map((d, idx) => ({ dayOfWeek: idx, openTime: d.openTime, closeTime: d.closeTime, enabled: d.enabled }))
      .filter((d) => d.enabled)
      .map((d) => ({ dayOfWeek: d.dayOfWeek, openTime: d.openTime, closeTime: d.closeTime }))

    const invalid = schedules.find((s) => s.openTime >= s.closeTime)
    if (invalid) {
      setError("La hora de cierre debe ser mayor a la de apertura.")
      return
    }

    startTransition(async () => {
      const res = await upsertCourt({
        id: initial?.id,
        venueId,
        sportSlug,
        name,
        surface,
        indoor,
        hasLighting,
        pricePerSlot: Number(pricePerSlot),
        slotDurationMinutes: Number(slotDuration),
        depositPercentage: Number(depositPct),
        active,
        schedules,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push("/panel/canchas")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Deporte</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {sports.map((s) => {
                  const isActive = sportSlug === s.slug
                  const disabled = !s.active
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSportSlug(s.slug)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-secondary",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {s.name}
                      {disabled && <span className="ml-1 text-[10px]">próx.</span>}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Nombre de la cancha</FieldLabel>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="surface">Superficie</FieldLabel>
                <Input
                  id="surface"
                  placeholder="Cemento, césped sintético..."
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                />
              </Field>
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
              <Field>
                <FieldLabel htmlFor="duration">Duración del turno (min)</FieldLabel>
                <Input
                  id="duration"
                  type="number"
                  min={30}
                  step={15}
                  required
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="deposit">Seña (%)</FieldLabel>
                <Input
                  id="deposit"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={depositPct}
                  onChange={(e) => setDepositPct(Number(e.target.value))}
                />
                <FieldDescription>Porcentaje del total que el jugador paga al reservar.</FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <input
                  id="indoor"
                  type="checkbox"
                  checked={indoor}
                  onChange={(e) => setIndoor(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <FieldLabel htmlFor="indoor">Cancha techada</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <input
                  id="lighting"
                  type="checkbox"
                  checked={hasLighting}
                  onChange={(e) => setHasLighting(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <FieldLabel htmlFor="lighting">Tiene iluminación</FieldLabel>
              </Field>
            </div>

            <Field orientation="horizontal">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <FieldLabel htmlFor="active">Cancha activa (visible para jugadores)</FieldLabel>
            </Field>

            <div>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Horarios de atención
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Tocá un día para abrirlo o cerrarlo. Usá los atajos para configurar varios días a la vez.
              </p>
              <ScheduleEditor days={days} onChange={setDays} />
            </div>
          </FieldGroup>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
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
                "Crear cancha"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
