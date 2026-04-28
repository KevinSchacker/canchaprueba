"use client"

import { useTransition } from "react"
import { setSubscriptionStatus } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"

export function SetSubStatusButtons({
  ownerId,
  currentStatus,
}: {
  ownerId: string
  currentStatus: string
}) {
  const [isPending, startTransition] = useTransition()

  function setStatus(status: string) {
    const fd = new FormData()
    fd.set("owner_id", ownerId)
    fd.set("status", status)
    startTransition(async () => {
      const res = await setSubscriptionStatus(fd)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== "active" && (
        <Button size="sm" variant="default" disabled={isPending} onClick={() => setStatus("active")}>
          Activar
        </Button>
      )}
      {currentStatus !== "paused" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("paused")}>
          Pausar
        </Button>
      )}
      {currentStatus !== "cancelled" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("cancelled")}>
          Cancelar
        </Button>
      )}
    </div>
  )
}
