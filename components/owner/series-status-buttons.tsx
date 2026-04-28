"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Spinner } from "@/components/ui/spinner"
import { setSeriesStatus } from "@/lib/owner/series-actions"

interface Props {
  seriesId: string
  status: "active" | "paused" | "cancelled"
}

export function SeriesStatusButtons({ seriesId, status }: Props) {
  const [pending, start] = useTransition()
  const apply = (next: "active" | "paused" | "cancelled") =>
    start(async () => {
      await setSeriesStatus(seriesId, next)
    })

  return (
    <ButtonGroup>
      {status !== "active" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("active")}>
          {pending ? <Spinner /> : "Reactivar"}
        </Button>
      )}
      {status === "active" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("paused")}>
          {pending ? <Spinner /> : "Pausar"}
        </Button>
      )}
      {status !== "cancelled" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("cancelled")}>
          {pending ? <Spinner /> : "Cancelar"}
        </Button>
      )}
    </ButtonGroup>
  )
}
