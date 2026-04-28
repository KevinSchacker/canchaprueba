"use client"

import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cancelBooking } from "@/lib/booking/actions"
import { useRouter } from "next/navigation"

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancelar
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Volver
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await cancelBooking(bookingId)
            setConfirming(false)
            router.refresh()
          })
        }}
      >
        {pending ? <Spinner /> : "Confirmar cancelación"}
      </Button>
    </div>
  )
}
