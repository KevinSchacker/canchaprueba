"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

type DateOption = { key: string; weekday: string; day: number; isToday: boolean }

interface Props {
  days: DateOption[]
  selected: string
  basePath: string
}

export function DateStrip({ days, selected, basePath }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", key)
    router.push(`${basePath}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seleccionar fecha">
      {days.map((d) => {
        const isActive = d.key === selected
        return (
          <button
            key={d.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(d.key)}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-xl border px-4 py-2 transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{d.weekday}</span>
            <span className="text-lg font-semibold leading-none">{d.day}</span>
            {d.isToday && (
              <span className={cn("mt-0.5 text-[10px] font-medium", isActive ? "opacity-90" : "text-accent")}>
                hoy
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
