"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { cn } from "@/lib/utils"
import { Copy } from "lucide-react"
import { type DaySchedule } from "@/lib/owner/utils"

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

interface Props {
  days: DaySchedule[]
  onChange: (days: DaySchedule[]) => void
  /** Otras canchas del mismo complejo para copiar horarios */
  siblingsSchedules?: { name: string; schedules: DaySchedule[] }[]
}

/**
 * Editor de horarios mejorado para el dueño.
 * - Toggle "Abierto/Cerrado" por día con un click.
 * - Atajos: Lun-Vie, Fin de semana, Todos los días.
 * - Aplicar el horario del primer día abierto al resto con un botón.
 */
export function ScheduleEditor({ days, onChange, siblingsSchedules }: Props) {
  const [copyFrom, setCopyFrom] = useState("")
  const updateDay = (i: number, patch: Partial<DaySchedule>) => {
    onChange(days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  const applyToRange = (idxs: number[], enabled: boolean) => {
    const ref = days.find((d) => d.enabled) ?? { openTime: "09:00", closeTime: "23:00", enabled: true }
    onChange(
      days.map((d, idx) =>
        idxs.includes(idx)
          ? enabled
            ? { enabled: true, openTime: d.enabled ? d.openTime : ref.openTime, closeTime: d.enabled ? d.closeTime : ref.closeTime }
            : { ...d, enabled: false }
          : d,
      ),
    )
  }

  const copyFirstToAll = () => {
    const first = days.find((d) => d.enabled)
    if (!first) return
    onChange(days.map((d) => (d.enabled ? { ...d, openTime: first.openTime, closeTime: first.closeTime } : d)))
  }

  const weekdays = [1, 2, 3, 4, 5]
  const weekend = [0, 6]
  const all = [0, 1, 2, 3, 4, 5, 6]

  const enabledCount = days.filter((d) => d.enabled).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atajos:</span>
        <ButtonGroup>
          <Button type="button" size="sm" variant="outline" onClick={() => applyToRange(weekdays, true)}>
            Abrir L-V
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyToRange(weekend, true)}>
            Abrir S-D
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => applyToRange(all, true)}>
            Todos los días
          </Button>
        </ButtonGroup>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyToRange(all, false)}>
          Cerrar todos
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={copyFirstToAll}
          disabled={enabledCount < 2}
          title="Copiar el horario del primer día abierto al resto"
        >
          Igualar horarios
        </Button>

        {siblingsSchedules && siblingsSchedules.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={copyFrom}
              onChange={(e) => {
                const val = e.target.value
                setCopyFrom(val)
                if (!val) return
                const sibling = siblingsSchedules.find((s) => s.name === val)
                if (sibling) onChange(sibling.schedules.map((d) => ({ ...d })))
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Igual que otra cancha…</option>
              {siblingsSchedules.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors",
              d.enabled ? "border-border bg-card" : "border-dashed border-border bg-secondary/30",
            )}
          >
            <button
              type="button"
              onClick={() => updateDay(i, { enabled: !d.enabled })}
              aria-pressed={d.enabled}
              className={cn(
                "flex w-32 items-center justify-between rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                d.enabled
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="hidden sm:inline">{DAY_LABELS[i]}</span>
              <span className="sm:hidden">{DAY_SHORT[i]}</span>
              <span className={cn("text-[10px] font-semibold uppercase", d.enabled ? "text-primary" : "text-muted-foreground")}>
                {d.enabled ? "Abierto" : "Cerrado"}
              </span>
            </button>

            {d.enabled ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="time"
                  value={d.openTime}
                  onChange={(e) => updateDay(i, { openTime: e.target.value })}
                  className="w-32"
                  aria-label={`Apertura ${DAY_LABELS[i]}`}
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="time"
                  value={d.closeTime}
                  onChange={(e) => updateDay(i, { closeTime: e.target.value })}
                  className="w-32"
                  aria-label={`Cierre ${DAY_LABELS[i]}`}
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Sin atención este día</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

