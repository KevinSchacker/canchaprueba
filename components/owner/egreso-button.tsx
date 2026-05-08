"use client"

import { useState, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowDownCircle, Banknote, CreditCard, Smartphone } from "lucide-react"
import { registerEgreso } from "@/lib/owner/actions"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const CONCEPTS = [
  "Personal / sueldos",
  "Limpieza / mantenimiento",
  "Servicios (agua, luz, gas)",
  "Materiales / equipamiento",
  "Otro",
]

const METHODS = [
  { id: "cash", label: "Efectivo", icon: Banknote },
  { id: "transfer", label: "Transferencia", icon: CreditCard },
  { id: "mercadopago", label: "MercadoPago", icon: Smartphone },
]

export function EgresoButton({ venueId }: { venueId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [concept, setConcept] = useState(CONCEPTS[0])
  const [method, setMethod] = useState("cash")
  const [pending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const onConfirm = () => {
    if (!amount || Number(amount) <= 0) {
      setError("Ingresá un monto válido.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await registerEgreso({ venueId, amount: Number(amount), concept, method })
      if (!res.ok) {
        setError(res.error ?? "Error al registrar.")
        return
      }
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setAmount("")
        router.refresh()
      }, 1500)
    })
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ArrowDownCircle className="h-4 w-4 text-destructive" />
          Registrar salida de caja
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Anotá un gasto del día para que el total sea la caja real neta.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Concepto</label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CONCEPTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Monto (ARS)</label>
            <input
              type="number"
              min={1}
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Pagado con</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors cursor-pointer",
                    method === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}
        {success && (
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">✓ Egreso registrado correctamente.</p>
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={pending} variant="destructive">
            {pending ? <><Spinner /> Guardando...</> : "Registrar egreso"}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <ArrowDownCircle className="h-4 w-4" />
        Registrar egreso
      </Button>
      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
