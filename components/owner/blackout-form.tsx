"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { createBlackout } from "@/lib/owner/blackouts-actions"

interface Props {
  courtId: string
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function BlackoutForm({ courtId }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(todayKey())
  const [from, setFrom] = useState("19:00")
  const [to, setTo] = useState("21:00")
  const [reason, setReason] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (from >= to) {
      setError("La hora de fin debe ser mayor a la de inicio.")
      return
    }

    const [y, m, d] = date.split("-").map(Number)
    const [fh, fm] = from.split(":").map(Number)
    const [th, tm] = to.split(":").map(Number)
    const startTime = new Date(y, m - 1, d, fh, fm).toISOString()
    const endTime = new Date(y, m - 1, d, th, tm).toISOString()

    start(async () => {
      const res = await createBlackout({ courtId, startTime, endTime, reason: reason.trim() || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setReason("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-4">
      <FieldGroup>
        <div className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="bl-date">Día</FieldLabel>
            <Input id="bl-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bl-from">Desde</FieldLabel>
            <Input id="bl-from" type="time" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="bl-to">Hasta</FieldLabel>
            <Input id="bl-to" type="time" required value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="bl-reason">Motivo (opcional)</FieldLabel>
          <Input
            id="bl-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mantenimiento, feriado, evento..."
          />
          <FieldDescription>Solo lo ven los dueños y administradores.</FieldDescription>
        </Field>
      </FieldGroup>
      {error && (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner /> Bloqueando...
            </>
          ) : (
            "Bloquear horario"
          )}
        </Button>
      </div>
    </form>
  )
}
