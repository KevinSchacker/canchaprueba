"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { setBookingPaidFull } from "@/lib/owner/actions"
import { useRouter } from "next/navigation"
import { DollarSign, CreditCard, Banknote, Smartphone } from "lucide-react"

interface Props {
  bookingId: string
  totalPrice: number
  depositAmount: number
  playerName: string
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo", icon: Banknote },
  { id: "mercadopago", label: "MercadoPago", icon: Smartphone },
  { id: "transfer", label: "Transferencia", icon: CreditCard },
]

export function CollectRemainingDialog({ bookingId, totalPrice, depositAmount, playerName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<string>("cash")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Para createPortal necesitamos que el componente esté montado en el cliente
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const remaining = totalPrice - depositAmount

  const onConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await setBookingPaidFull(bookingId, method)
      if (!res.ok) {
        setError(res.error ?? "Error al registrar el pago.")
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Cerrar al hacer click en el backdrop
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Cobrar saldo restante</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrá el pago del saldo de <strong className="text-foreground">{playerName}</strong>.
        </p>

        <div className="mt-4 rounded-lg bg-secondary/50 p-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total del turno</span>
            <span className="font-medium">${totalPrice.toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seña ya cobrada</span>
            <span className="text-primary font-medium">- ${depositAmount.toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="font-semibold text-foreground">Saldo a cobrar</span>
            <span className="font-bold text-lg text-foreground">${remaining.toLocaleString("es-AR")}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors cursor-pointer ${
                  method === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? <><Spinner /> Guardando...</> : "Confirmar cobro"}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
      >
        <DollarSign className="h-3.5 w-3.5 mr-1" />
        Cobrar restante
      </Button>

      {/* Portal: se monta directamente en document.body, fuera de cualquier stacking context */}
      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
