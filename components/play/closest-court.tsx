"use client"

import { useState, useEffect } from "react"
import { CourtCard } from "./court-card"
import { MapPin } from "lucide-react"

type CourtRow = {
  id: string
  name: string
  surface: string | null
  indoor: boolean
  hasLighting: boolean
  pricePerSlot: number
  slotDurationMinutes: number
  venues: {
    id: string
    name: string
    city: string
    cover_image_url: string | null
    latitude: number | null
    longitude: number | null
  }
}

interface Props {
  courts: CourtRow[]
}

// Distance between two coordinates in km (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c // Distance in km
  return d
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180)
}

export function ClosestCourt({ courts }: Props) {
  const [closest, setClosest] = useState<CourtRow | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || courts.length === 0) return

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude
          const userLng = position.coords.longitude

          let minDistance = Infinity
          let nearestCourt: CourtRow | null = null

          for (const court of courts) {
            if (court.venues.latitude != null && court.venues.longitude != null) {
              const d = getDistanceFromLatLonInKm(userLat, userLng, court.venues.latitude, court.venues.longitude)
              if (d < minDistance) {
                minDistance = d
                nearestCourt = court
              }
            }
          }

          if (nearestCourt) {
            setClosest(nearestCourt)
            setDistanceKm(minDistance)
          }
        },
        (error) => {
          console.warn("Error obtaining location", error)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    }
  }, [courts])

  if (!closest) return null

  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        La cancha más cerca tuyo {distanceKm !== null && <span className="lowercase normal-case">({distanceKm < 1 ? "< 1 km" : `${distanceKm.toFixed(1)} km`})</span>}
      </h2>
      <CourtCard
        id={closest.id}
        venueName={closest.venues.name}
        courtName={closest.name}
        city={closest.venues.city}
        surface={closest.surface}
        indoor={closest.indoor}
        hasLighting={closest.hasLighting}
        pricePerSlot={closest.pricePerSlot}
        slotDurationMinutes={closest.slotDurationMinutes}
        coverImageUrl={closest.venues.cover_image_url}
      />
    </div>
  )
}
