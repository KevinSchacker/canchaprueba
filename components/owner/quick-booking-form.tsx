"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { createQuickBooking } from "@/lib/owner/actions"
import { cn } from "@/lib/utils"
import { User, Phone, Calendar, Clock, MapPin, DollarSign } from "lucide-react"

interface Court {
  id: string
  name: string
  price_per_slot: number
  deposit_percentage: number
  slot_duration_minutes: number
}

interface Props {
  courts: Court[]
  defaultDate?: string
  defaultTime?: string
  defaultCourtId?: string
}

const PAYMENT_METHODS = [
  { id: "cash", label: "💵 Efectivo" },
  { id: "mercadopago", label: "📱 MercadoPago" },
  { id: "transfer", label: "🏦 Transferencia" },
  { id: "pending", label: "⏳ A confirmar" },
]

export function QuickBookingForm({ courts, defaultDate, defaultTime, defaultCourtId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const nowHH = String(new Date().getHours()).padStart(2, "0")

  const [courtId, setCourtId] = useState(defaultCourtId ?? courts[0]?.id ?? "")
  const [date, setDate] = useState(defaultDate ?? todayStr)
  const [time, setTime] = useState(defaultTime ?? `${nowHH}:00`)
  const [duration, setDuration] = useState<number>(0)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [depositPaid, setDepositPaid] = useState(true)
  const [notes, setNotes] = useState("")

  const selectedCourt = courts.find((c) => c.id === courtId)
  
  const slotDurationMinutes = selectedCourt?.slot_duration_minutes || 60
  const maxDuration = 180;
  const minMultiplier = slotDurationMinutes === 30 ? 2 : 1;
  const durationOptions: number[] = [];
  for (let m = minMultiplier; (m * slotDurationMinutes) <= maxDuration; m++) {
    durationOptions.push(m * slotDurationMinutes);
  }

  const currentDuration = duration || durationOptions[0] || slotDurationMinutes;
  const slotsNeeded = Math.max(1, Math.ceil(currentDuration / slotDurationMinutes));
  const totalPrice = selectedCourt ? selectedCourt.price_per_slot * slotsNeeded : 0;
  
  const depositAmount = selectedCourt
    ? Math.round((selectedCourt.deposit_percentage / 100) * totalPrice)
    : 0

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!courtId || !date || !time || !guestName) {
      setError("Completá todos los campos obligatorios.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createQuickBooking({
        courtId,
        date,
        time,
        guestName,
        guestPhone,
        paymentMethod,
        depositPaid,
        notes,
        durationMinutes: currentDuration,
      })
      if (!res.ok) {
        setError(res.error ?? "Error al crear la reserva.")
        return
      }
      router.push("/panel/reservas")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            {/* Cancha */}
            <Field>
              <FieldLabel>
                <MapPin className="inline h-3.5 w-3.5 mr-1 text-accent" />
                Cancha *
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                {courts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourtId(c.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      courtId === c.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>

            {/* Fecha y hora */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-accent" />
                  Fecha *
                </FieldLabel>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>
                  <Clock className="inline h-3.5 w-3.5 mr-1 text-accent" />
                  Hora de inicio *
                </FieldLabel>
                <Input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>
                  <Clock className="inline h-3.5 w-3.5 mr-1 text-accent" />
                  Duración *
                </FieldLabel>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={currentDuration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {durationOptions.map((d) => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${d / 60} hs` : `${d} min`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Datos del cliente */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>
                  <User className="inline h-3.5 w-3.5 mr-1 text-accent" />
                  Nombre del cliente *
                </FieldLabel>
                <Input
                  required
                  placeholder="Juan Pérez"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>
                  <Phone className="inline h-3.5 w-3.5 mr-1 text-accent" />
                  Teléfono (opcional)
                </FieldLabel>
                <Input
                  type="tel"
                  placeholder="+54 376 412 3456"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </Field>
            </div>

            {/* Precio y seña */}
            {selectedCourt && (
              <div className="rounded-lg bg-secondary/40 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Precio del turno: <strong>${totalPrice.toLocaleString("es-AR")}</strong>
                  <span className="text-muted-foreground ml-auto">
                    Seña ({selectedCourt.deposit_percentage}%): ${depositAmount.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            )}

            {/* Método de pago */}
            <Field>
              <FieldLabel>Cobro de seña</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAYMENT_METHODS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center",
                      paymentMethod === id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>Seña ya cobrada</span>
              </label>
            </Field>

            {/* Notas */}
            <Field>
              <FieldLabel>Notas (opcional)</FieldLabel>
              <Input
                placeholder="Ej: trae raqueta propia, paga al llegar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="mt-6 flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <><Spinner /> Creando...</> : "Crear reserva"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
