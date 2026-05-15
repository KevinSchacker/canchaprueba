"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { upsertCourt, type CourtScheduleInput } from "@/lib/owner/actions"
import { ScheduleEditor } from "@/components/owner/schedule-editor"
import { buildDefaultSchedules, buildSchedulesFromInitial, type DaySchedule } from "@/lib/owner/utils"
import { cn } from "@/lib/utils"
import { Info, DollarSign, Clock3, Users, BanknoteIcon, CalendarClock, AlignLeft, Moon, Star, Image as ImageIcon } from "lucide-react"
import { CourtImagesUpload, type CourtImage } from "@/components/owner/court-images-upload"
import { upsertCourtImages } from "@/lib/owner/actions"

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
  description?: string | null
  maxPlayers?: number | null
  cancellationHoursBefore?: number | null
  cancellationRefundPct?: number | null
  maxDaysAhead?: number | null
  minHoursAhead?: number | null
  nightPriceEnabled?: boolean
  nightPriceFrom?: string
  nightPriceTo?: string
  nightPrice?: number | null
  weekendPriceEnabled?: boolean
  weekendPrice?: number | null
  images: CourtImage[]
} | null

interface Props {
  venueId: string
  sports: SportOption[]
  initial: CourtInitial
  /** Otras canchas del complejo para el atajo "Igual que otra cancha" */
  siblingsSchedules?: { name: string; schedules: DaySchedule[] }[]
}

export function CourtForm({ venueId, sports, initial, siblingsSchedules }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const activeSports = sports.filter((s) => s.active)
  
  // Si initial.sportSlug no está en activeSports pero la cancha ya lo tiene, lo forzamos a estar en la lista (para no romper la vista de edición)
  if (initial && initial.sportSlug && !activeSports.find(s => s.slug === initial.sportSlug)) {
    const hiddenSport = sports.find(s => s.slug === initial.sportSlug)
    if (hiddenSport) activeSports.push(hiddenSport)
  }

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

  // --- Nuevos campos ---
  const [description, setDescription] = useState(initial?.description ?? "")
  
  // Default de capacidad según el deporte
  const getDefaultPlayers = (slug: string) => {
    if (slug === "padel" || slug === "tenis") return 4
    if (slug === "futbol_5") return 10
    if (slug === "futbol_7") return 14
    if (slug === "basquet") return 10
    return 4
  }
  
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers ?? getDefaultPlayers(sportSlug))
  const [cancellationHours, setCancellationHours] = useState(initial?.cancellationHoursBefore ?? 24)
  const [cancellationRefund, setCancellationRefund] = useState(initial?.cancellationRefundPct ?? 100)
  const [maxDaysAhead, setMaxDaysAhead] = useState(initial?.maxDaysAhead ?? 14)
  const [minHoursAhead, setMinHoursAhead] = useState(initial?.minHoursAhead ?? 1)

  // Precio nocturno
  const [nightEnabled, setNightEnabled] = useState(initial?.nightPriceEnabled ?? false)
  const [nightFrom, setNightFrom] = useState(initial?.nightPriceFrom ?? "20:00")
  const [nightTo, setNightTo] = useState(initial?.nightPriceTo ?? "23:00")
  const [nightPrice, setNightPrice] = useState(initial?.nightPrice ?? pricePerSlot)

  // Precio fin de semana
  const [weekendEnabled, setWeekendEnabled] = useState(initial?.weekendPriceEnabled ?? false)
  const [weekendPrice, setWeekendPrice] = useState(initial?.weekendPrice ?? pricePerSlot)

  // Fotos
  const [images, setImages] = useState<CourtImage[]>(initial?.images ?? [])

  // --- Cálculo en vivo de seña ---
  const depositAmount = Math.round((depositPct / 100) * pricePerSlot)

  // --- Validaciones inline ---
  const validateFields = () => {
    const errs: Record<string, string> = {}
    if (pricePerSlot <= 0) errs.price = "El precio debe ser mayor a $0."
    if (slotDuration < 30) errs.duration = "La duración mínima es de 30 minutos."
    if (depositPct < 0 || depositPct > 100) errs.deposit = "La seña debe estar entre 0% y 100%."
    if (maxPlayers < 2) errs.maxPlayers = "El mínimo de jugadores es 2."
    if (cancellationHours < 0) errs.cancellationHours = "No puede ser negativo."
    if (cancellationRefund < 0 || cancellationRefund > 100) errs.cancellationRefund = "Debe estar entre 0 y 100."
    if (maxDaysAhead < 1) errs.maxDaysAhead = "Debe ser al menos 1 día."
    if (minHoursAhead < 0) errs.minHoursAhead = "No puede ser negativo."
    return errs
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const errs = validateFields()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})

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
        description: description || null,
        maxPlayers: Number(maxPlayers),
        cancellationHoursBefore: Number(cancellationHours),
        cancellationRefundPct: Number(cancellationRefund),
        maxDaysAhead: Number(maxDaysAhead),
        minHoursAhead: Number(minHoursAhead),
        priceRules: {
          night: nightEnabled ? { from: nightFrom, to: nightTo, price: Number(nightPrice) } : null,
          weekend: weekendEnabled ? { price: Number(weekendPrice) } : null,
        },
      })
      if (!res.ok) {
        setError(res.error)
        return
      }

      // Guardar imágenes si la cancha se creó/actualizó con éxito
      const imgRes = await upsertCourtImages(res.id, images.map((img, i) => ({ url: img.url, position: i })))
      if (!imgRes.ok) {
        setError("Cancha guardada, pero hubo un error con las imágenes: " + imgRes.error)
        return
      }

      router.push("/panel/canchas")
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 pb-24">
      {/* ── Sección: Información básica ── */}
      <SectionCard icon={<Star className="h-4 w-4" />} title="Información básica">
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
                    onClick={() => {
                      setSportSlug(s.slug)
                      if (!initial) {
                        setMaxPlayers(getDefaultPlayers(s.slug))
                        if (s.slug === "padel") setSurface("Césped sintético")
                        if (s.slug === "futbol" || s.slug === "futbol_5" || s.slug === "futbol_7") setSurface("Césped sintético")
                        if (s.slug === "tenis") setSurface("Polvo de ladrillo")
                        if (s.slug === "basquet") setSurface("Parquet")
                      }
                    }}
                    title={disabled ? "Disponible pronto — te avisamos" : undefined}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {s.name}
                    {disabled && (
                      <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Próx.
                      </span>
                    )}
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
                placeholder={sportSlug.includes("futbol") ? "Sintético, natural, parquet..." : sportSlug === "tenis" ? "Polvo de ladrillo, cemento, césped..." : "Cemento, césped sintético..."}
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
                onChange={(e) => {
                  setPricePerSlot(Number(e.target.value))
                  if (fieldErrors.price) setFieldErrors((f) => ({ ...f, price: "" }))
                }}
                className={cn(fieldErrors.price && "border-destructive")}
              />
              {fieldErrors.price && <p className="text-xs text-destructive">{fieldErrors.price}</p>}
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
                onChange={(e) => {
                  setSlotDuration(Number(e.target.value))
                  if (fieldErrors.duration) setFieldErrors((f) => ({ ...f, duration: "" }))
                }}
                className={cn(fieldErrors.duration && "border-destructive")}
              />
              {fieldErrors.duration && <p className="text-xs text-destructive">{fieldErrors.duration}</p>}
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
                onChange={(e) => {
                  setDepositPct(Number(e.target.value))
                  if (fieldErrors.deposit) setFieldErrors((f) => ({ ...f, deposit: "" }))
                }}
                className={cn(fieldErrors.deposit && "border-destructive")}
              />
              {/* Preview de seña en vivo */}
              {pricePerSlot > 0 && depositPct > 0 ? (
                <FieldDescription>
                  <span className="font-medium text-foreground">
                    El jugador paga ${depositAmount.toLocaleString("es-AR")} al reservar.
                  </span>{" "}
                  ({depositPct}% de ${pricePerSlot.toLocaleString("es-AR")})
                </FieldDescription>
              ) : (
                <FieldDescription>Porcentaje del total que el jugador paga al reservar.</FieldDescription>
              )}
              {fieldErrors.deposit && <p className="text-xs text-destructive">{fieldErrors.deposit}</p>}
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
        </FieldGroup>
      </SectionCard>

      {/* ── Sección: Fotos ── */}
      <SectionCard icon={<ImageIcon className="h-4 w-4" />} title="Fotos de la cancha">
        <CourtImagesUpload 
          initialImages={images} 
          onChange={setImages} 
          maxImages={6} 
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Subí al menos una foto para que los jugadores puedan ver cómo es tu cancha.
        </p>
      </SectionCard>

      {/* ── Sección: Descripción ── */}
      <SectionCard icon={<AlignLeft className="h-4 w-4" />} title="Descripción">
        <Field>
          <FieldLabel htmlFor="description">Notas para los jugadores</FieldLabel>
          <textarea
            id="description"
            rows={3}
            maxLength={500}
            placeholder={"Traé raquetas propias. Estacionamiento gratuito. Acceso por portón lateral..."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
          />
          <FieldDescription>{description.length}/500 caracteres</FieldDescription>
        </Field>
      </SectionCard>

      {/* ── Sección: Horarios ── */}
      <SectionCard icon={<Clock3 className="h-4 w-4" />} title="Horarios de atención">
        <p className="mb-3 text-xs text-muted-foreground">
          Tocá un día para abrirlo o cerrarlo. Usá los atajos para configurar varios días a la vez.
        </p>
        <ScheduleEditor days={days} onChange={setDays} siblingsSchedules={siblingsSchedules} />
      </SectionCard>

      {/* ── Sección: Precios diferenciados ── */}
      <SectionCard icon={<Moon className="h-4 w-4" />} title="Precios diferenciados">
        <div className="flex flex-col gap-4">
          {/* Nocturno */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Precio nocturno</p>
                <p className="text-xs text-muted-foreground">Precio diferente para horario nocturno</p>
              </div>
              <button
                type="button"
                onClick={() => setNightEnabled((v) => !v)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  nightEnabled ? "bg-primary" : "bg-muted",
                )}
                role="switch"
                aria-checked={nightEnabled}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    nightEnabled && "translate-x-4",
                  )}
                />
              </button>
            </div>
            {nightEnabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="nightFrom">Desde</FieldLabel>
                  <Input id="nightFrom" type="time" value={nightFrom} onChange={(e) => setNightFrom(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="nightTo">Hasta</FieldLabel>
                  <Input id="nightTo" type="time" value={nightTo} onChange={(e) => setNightTo(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="nightPrice">Precio (ARS)</FieldLabel>
                  <Input
                    id="nightPrice"
                    type="number"
                    min={0}
                    value={nightPrice}
                    onChange={(e) => setNightPrice(Number(e.target.value))}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Fin de semana */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Precio fin de semana</p>
                <p className="text-xs text-muted-foreground">Sábado y domingo</p>
              </div>
              <button
                type="button"
                onClick={() => setWeekendEnabled((v) => !v)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  weekendEnabled ? "bg-primary" : "bg-muted",
                )}
                role="switch"
                aria-checked={weekendEnabled}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    weekendEnabled && "translate-x-4",
                  )}
                />
              </button>
            </div>
            {weekendEnabled && (
              <div className="mt-3">
                <Field>
                  <FieldLabel htmlFor="weekendPrice">Precio (ARS)</FieldLabel>
                  <Input
                    id="weekendPrice"
                    type="number"
                    min={0}
                    value={weekendPrice}
                    onChange={(e) => setWeekendPrice(Number(e.target.value))}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Sección: Capacidad ── */}
      <SectionCard icon={<Users className="h-4 w-4" />} title="Capacidad">
        <Field>
          <FieldLabel htmlFor="maxPlayers">Máximo de jugadores por turno</FieldLabel>
          <Input
            id="maxPlayers"
            type="number"
            min={2}
            max={22}
            value={maxPlayers}
            onChange={(e) => {
              setMaxPlayers(Number(e.target.value))
              if (fieldErrors.maxPlayers) setFieldErrors((f) => ({ ...f, maxPlayers: "" }))
            }}
            className={cn("max-w-[120px]", fieldErrors.maxPlayers && "border-destructive")}
          />
          {fieldErrors.maxPlayers && <p className="text-xs text-destructive">{fieldErrors.maxPlayers}</p>}
          <FieldDescription>
            {sportSlug.includes("futbol") ? "Útil para indicar si la cancha es para 10, 14 o 22 jugadores." : 
             sportSlug === "padel" || sportSlug === "tenis" ? "Por lo general son 2 o 4 jugadores." :
             "Cantidad de personas permitidas en la cancha."}
          </FieldDescription>
        </Field>
      </SectionCard>

      {/* ── Sección: Política de cancelación ── */}
      <SectionCard icon={<BanknoteIcon className="h-4 w-4" />} title="Política de cancelación">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cancelHours">Cancelación hasta (horas antes)</FieldLabel>
            <Input
              id="cancelHours"
              type="number"
              min={0}
              value={cancellationHours}
              onChange={(e) => {
                setCancellationHours(Number(e.target.value))
                if (fieldErrors.cancellationHours) setFieldErrors((f) => ({ ...f, cancellationHours: "" }))
              }}
              className={cn("max-w-[120px]", fieldErrors.cancellationHours && "border-destructive")}
            />
            {fieldErrors.cancellationHours && <p className="text-xs text-destructive">{fieldErrors.cancellationHours}</p>}
          </Field>
          <Field>
            <FieldLabel htmlFor="cancelRefund">Devolución de seña (%)</FieldLabel>
            <Input
              id="cancelRefund"
              type="number"
              min={0}
              max={100}
              value={cancellationRefund}
              onChange={(e) => {
                setCancellationRefund(Number(e.target.value))
                if (fieldErrors.cancellationRefund) setFieldErrors((f) => ({ ...f, cancellationRefund: "" }))
              }}
              className={cn("max-w-[120px]", fieldErrors.cancellationRefund && "border-destructive")}
            />
            {fieldErrors.cancellationRefund && <p className="text-xs text-destructive">{fieldErrors.cancellationRefund}</p>}
          </Field>
        </div>
        {/* Preview de política */}
        {cancellationHours >= 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Si el jugador cancela con al menos{" "}
              <strong className="text-foreground">{cancellationHours}hs de anticipación</strong>, se le devuelve el{" "}
              <strong className="text-foreground">{cancellationRefund}%</strong> de la seña. Si cancela después, pierde
              la seña.
            </span>
          </div>
        )}
      </SectionCard>

      {/* ── Sección: Ventana de reservas ── */}
      <SectionCard icon={<CalendarClock className="h-4 w-4" />} title="Ventana de reservas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="maxDays">Máximo días de anticipación</FieldLabel>
            <Input
              id="maxDays"
              type="number"
              min={1}
              max={60}
              value={maxDaysAhead}
              onChange={(e) => {
                setMaxDaysAhead(Number(e.target.value))
                if (fieldErrors.maxDaysAhead) setFieldErrors((f) => ({ ...f, maxDaysAhead: "" }))
              }}
              className={cn("max-w-[120px]", fieldErrors.maxDaysAhead && "border-destructive")}
            />
            {fieldErrors.maxDaysAhead && <p className="text-xs text-destructive">{fieldErrors.maxDaysAhead}</p>}
            <FieldDescription>Ej. 14 = el jugador puede reservar hasta 2 semanas antes.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="minHours">Mínimo horas de anticipación</FieldLabel>
            <Input
              id="minHours"
              type="number"
              min={0}
              max={48}
              value={minHoursAhead}
              onChange={(e) => {
                setMinHoursAhead(Number(e.target.value))
                if (fieldErrors.minHoursAhead) setFieldErrors((f) => ({ ...f, minHoursAhead: "" }))
              }}
              className={cn("max-w-[120px]", fieldErrors.minHoursAhead && "border-destructive")}
            />
            {fieldErrors.minHoursAhead && <p className="text-xs text-destructive">{fieldErrors.minHoursAhead}</p>}
            <FieldDescription>Ej. 1 = puede reservar para dentro de 1 hora.</FieldDescription>
          </Field>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Los jugadores pueden reservar con{" "}
            <strong className="text-foreground">mínimo {minHoursAhead}hs</strong> y{" "}
            <strong className="text-foreground">máximo {maxDaysAhead} días</strong> de anticipación.
          </span>
        </div>
      </SectionCard>

      {/* ── Error general ── */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* ── Sticky footer con botón guardar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 py-3">
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
      </div>
    </form>
  )
}

/** Tarjeta de sección con icono y título */
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
