"use client"

import { useTransition } from "react"
import { upsertSubscription } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SubscriptionForm({
  ownerId,
  defaultStatus,
  defaultPlan,
  defaultPrice,
  defaultPeriodEnd,
}: {
  ownerId: string
  defaultStatus: string
  defaultPlan: string
  defaultPrice: number
  defaultPeriodEnd: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    formData.set("owner_id", ownerId)
    startTransition(async () => {
      const res = await upsertSubscription(formData)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-4">
      <Field>
        <FieldLabel htmlFor={`status-${ownerId}`}>Estado</FieldLabel>
        <Select name="status" defaultValue={defaultStatus}>
          <SelectTrigger id={`status-${ownerId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trial">Prueba</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="past_due">Atrasada</SelectItem>
            <SelectItem value="paused">Pausada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`plan-${ownerId}`}>Plan</FieldLabel>
        <Input id={`plan-${ownerId}`} name="plan" defaultValue={defaultPlan} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`price-${ownerId}`}>Mensual ARS</FieldLabel>
        <Input id={`price-${ownerId}`} name="monthly_price" type="number" min={0} step={1} defaultValue={defaultPrice} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`end-${ownerId}`}>Vence</FieldLabel>
        <Input
          id={`end-${ownerId}`}
          name="current_period_end"
          type="date"
          defaultValue={defaultPeriodEnd ? defaultPeriodEnd.slice(0, 10) : ""}
        />
      </Field>

      <div className="sm:col-span-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  )
}
