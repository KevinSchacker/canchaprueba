"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { devOnlyClearAllBookings } from "@/lib/admin/actions"
import { Trash2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export function ClearDataButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await devOnlyClearAllBookings()
      if (!res.ok) {
        setError(res.error ?? "Error al limpiar datos")
        return
      }
      setOpen(false)
      router.refresh()
      alert("Base de datos limpia (reservas, movimientos y reseñas)")
    })
  }

  if (!open) {
    return (
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Limpiar DB (Dev Only)
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border-2 border-destructive bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-bold">¡PELIGRO! Acción Irreversible</h3>
        </div>
        
        <p className="mt-3 text-sm text-foreground">
          Estás por eliminar **TODAS** las reservas, movimientos de caja y reseñas de la base de datos.
          Esta acción no se puede deshacer y es solo para facilitar las pruebas de desarrollo.
        </p>

        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">
          ⚠️ Esto borrará los datos de todos los complejos, no solo de uno.
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={pending}
            className="font-bold"
          >
            {pending ? <><Spinner /> Borrando...</> : "SÍ, ELIMINAR TODO"}
          </Button>
        </div>
      </div>
    </div>
  )
}
