"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Trash2 } from "lucide-react"
import { deleteBlackout } from "@/lib/owner/blackouts-actions"

export function BlackoutDeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminar este bloqueo?")) return
        start(async () => {
          await deleteBlackout(id)
        })
      }}
      aria-label="Eliminar bloqueo"
    >
      {pending ? <Spinner /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
