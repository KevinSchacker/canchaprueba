"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useState, useTransition } from "react"
import { payDepositMock } from "@/lib/booking/actions"
import { useRouter } from "next/navigation"

interface Props {
  bookingId: string
  amount: number
}

export function PayDepositButton({ bookingId, amount }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    setError(null)
    startTransition(async () => {
      const res = await payDepositMock(bookingId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={pending} className="w-full" size="lg">
        {pending ? (
          <>
            <Spinner /> Procesando...
          </>
        ) : (
          <>Pagar seña · ${amount.toLocaleString("es-AR")}</>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Pago simulado · próximamente integrado con MercadoPago
      </p>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
