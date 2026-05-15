"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { setVenueAllowedSports } from "@/lib/admin/actions"

interface Props {
  venueId: string
  allSports: { id: string; slug: string; name: string }[]
  allowedSports: string[] | null // slugs
}

export function VenueSportsManager({ venueId, allSports, allowedSports }: Props) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string[]>(allowedSports || ["padel"])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const toggleSport = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
    setSuccess(false)
  }

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("venue_id", venueId)
      formData.append("allowed_sports", JSON.stringify(selected))
      
      const res = await setVenueAllowedSports(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="mt-3 w-full rounded-md bg-secondary/20 p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Deportes habilitados
      </p>
      <div className="flex flex-wrap gap-2">
        {allSports.map((sport) => {
          const isSelected = selected.includes(sport.slug)
          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => toggleSport(sport.slug)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {isSelected && <Check className="h-3 w-3" />}
              {sport.name}
            </button>
          )
        })}
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs">
          {error && <span className="text-destructive">{error}</span>}
          {success && <span className="text-primary font-medium">Guardado</span>}
        </div>
        <Button 
          size="sm" 
          variant="secondary" 
          className="h-7 text-xs" 
          onClick={handleSave} 
          disabled={pending}
        >
          {pending ? <Spinner className="mr-1 h-3 w-3" /> : "Guardar deportes"}
        </Button>
      </div>
    </div>
  )
}
