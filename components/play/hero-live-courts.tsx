"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"

type CourtHeroRow = {
  id: string
  name: string
  price: number
  sport: string
  venues: {
    name: string
    city: string
    latitude: number | null
    longitude: number | null
  }
}

interface Props {
  courts: CourtHeroRow[]
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })
  .replace(/^\w/, c => c.toUpperCase())

export function HeroLiveCourts({ courts }: Props) {
  const [nearest, setNearest] = useState<CourtHeroRow[]>([])
  const [nearestCity, setNearestCity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (courts.length === 0) {
      setLoading(false)
      return
    }

    const fallback = () => {
      const slice = courts.slice(0, 3)
      setNearest(slice)
      setNearestCity(slice[0]?.venues.city ?? null)
      setLoading(false)
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude

          const withDistance = courts
            .map((court) => {
              const distance =
                court.venues.latitude != null && court.venues.longitude != null
                  ? getDistanceFromLatLonInKm(userLat, userLng, court.venues.latitude, court.venues.longitude)
                  : Infinity
              return { ...court, distance }
            })
            .sort((a, b) => a.distance - b.distance)

          const top3 = withDistance.slice(0, 3)
          setNearest(top3)
          setNearestCity(top3[0]?.venues.city ?? null)
          setLoading(false)
        },
        fallback,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      fallback()
    }
  }, [courts])

  const displayCourts = nearest.length > 0 ? nearest : courts.slice(0, 3)
  const cityLabel = nearestCity ?? displayCourts[0]?.venues.city ?? "Misiones"

  return (
    <>
      {/* Header dinámico */}
      <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">
            {loading ? "Buscando canchas…" : `${cityLabel}`}
          </span>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Canchas
        </span>
      </div>

      {/* Lista de canchas */}
      <div className="flex flex-col gap-3 p-5">
        {displayCourts.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-card-foreground">{c.venues.name}</span>
              <span className="text-xs text-muted-foreground">{c.sport} · {c.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                ${Number(c.price).toLocaleString("es-AR")}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Ver turnos
              </span>
            </div>
          </div>
        ))}

        {displayCourts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
            No hay canchas disponibles en este momento.
          </div>
        )}
      </div>
    </>
  )
}
