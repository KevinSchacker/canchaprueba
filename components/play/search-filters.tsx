"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type Sport = { id: string; slug: string; name: string; active: boolean }

interface Props {
  sports: Sport[]
  cities: string[]
}

export function SearchFilters({ sports, cities }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSport = searchParams.get("sport") ?? sports.find((s) => s.active)?.slug ?? ""
  const currentCity = searchParams.get("city") ?? ""
  const [city, setCity] = useState(currentCity)

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === "") params.delete(key)
    else params.set(key, value)
    router.push(`/play?${params.toString()}`)
  }

  const onCitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setParam("city", city.trim() || null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sport chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Deportes">
        {sports.map((s) => {
          const isActive = s.slug === currentSport
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setParam("sport", s.slug)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                  : "border-border bg-card text-foreground hover:bg-secondary hover:shadow-sm",
              )}
            >
              {s.name}
            </button>
          )
        })}
      </div>

      {/* City search + chips */}
      <form onSubmit={onCitySubmit} className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="search"
            placeholder="Buscar por ciudad (Posadas, Oberá...)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="pl-9 h-12 shadow-sm transition-shadow focus-visible:shadow-md focus-visible:ring-primary/20 rounded-xl"
            aria-label="Ciudad"
          />
          {currentCity && (
            <button
              type="button"
              onClick={() => {
                setCity("")
                setParam("city", null)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Limpiar ciudad"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" variant="default" size="default">
          Buscar
        </Button>
      </form>

      {cities.length > 0 && !currentCity && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCity(c)
                setParam("city", c)
              }}
              className="shrink-0 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary hover:scale-105"
            >
              <MapPin className="mr-1 inline h-3 w-3 text-accent" aria-hidden="true" />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
