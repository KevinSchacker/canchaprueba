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

// Distance between two coordinates in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c
  return d
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

export function HeroLiveCourts({ courts }: Props) {
  const [nearest, setNearest] = useState<CourtHeroRow[]>([])

  useEffect(() => {
    if (typeof window === "undefined" || courts.length === 0) return

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude

          const withDistance = courts
            .map((court) => {
              if (court.venues.latitude != null && court.venues.longitude != null) {
                const distance = getDistanceFromLatLonInKm(
                  userLat,
                  userLng,
                  court.venues.latitude,
                  court.venues.longitude
                )
                return { ...court, distance }
              }
              return { ...court, distance: Infinity }
            })
            .sort((a, b) => a.distance - b.distance)

          setNearest(withDistance.slice(0, 3))
        },
        () => {
          // Fallback if no location: just show 3 random
          setNearest(courts.slice(0, 3))
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      setNearest(courts.slice(0, 3))
    }
  }, [courts])

  const displayCourts = nearest.length > 0 ? nearest : courts.slice(0, 3)

  return (
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
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-foreground">
                ${Number(c.price).toLocaleString("es-AR")}
              </span>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Libre
            </span>
          </div>
        </div>
      ))}
      
      {displayCourts.length === 0 && (
         <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
           Cargando canchas cercanas...
         </div>
      )}
    </div>
  )
}
