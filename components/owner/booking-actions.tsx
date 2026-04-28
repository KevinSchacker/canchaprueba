"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Spinner } from "@/components/ui/spinner"
import { setBookingStatus } from "@/lib/owner/actions"
import { useRouter } from "next/navigation"

interface Props {
  bookingId: string
  status: string
}

export function BookingActions({ bookingId, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const onAction = (next: "confirmed" | "cancelled" | "completed" | "no_show") => {
    startTransition(async () => {
      await setBookingStatus(bookingId, next)
      router.refresh()
    })
  }

  if (pending) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Spinner /> Actualizando...
      </div>
    )
  }

  if (status === "pending") {
    return (
      <ButtonGroup>
        <Button size="sm" variant="default" onClick={() => onAction("confirmed")}>
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAction("cancelled")}>
          Cancelar
        </Button>
      </ButtonGroup>
    )
  }

  if (status === "confirmed") {
    return (
      <ButtonGroup>
        <Button size="sm" variant="outline" onClick={() => onAction("completed")}>
          Marcar jugada
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onAction("no_show")}>
          No vino
        </Button>
      </ButtonGroup>
    )
  }

  return null
}
