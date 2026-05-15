import Link from "next/link"
import { MapPin, Sun, Lightbulb, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"

interface Props {
  id: string
  venueName: string
  courtName: string
  city: string
  surface: string | null
  indoor: boolean
  hasLighting: boolean
  pricePerSlot: number
  slotDurationMinutes: number
  coverImageUrl: string | null
}

export function CourtCard({
  id,
  venueName,
  courtName,
  city,
  surface,
  indoor,
  hasLighting,
  pricePerSlot,
  slotDurationMinutes,
  coverImageUrl,
}: Props) {
  return (
    <Link
      href={`/play/cancha/${id}`}
      className="group block rounded-xl outline-none ring-offset-2 transition-all focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50">
        <div className="relative h-44 w-full overflow-hidden bg-secondary">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl || "/placeholder.svg"}
              alt={`Foto de ${venueName}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10 transition-transform duration-500 group-hover:scale-105">
              <span className="text-sm font-medium text-primary/60">{venueName}</span>
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-background/80 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-foreground shadow-sm ring-1 ring-border/50">
            ${pricePerSlot.toLocaleString("es-AR")}
          </span>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <h3 className="text-base font-semibold leading-tight text-foreground">{venueName}</h3>
              <p className="text-sm text-muted-foreground">{courtName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {city}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {surface && (
              <span className="rounded-md bg-secondary/70 border border-border/50 px-2 py-0.5 text-xs text-secondary-foreground font-medium">{surface}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary/70 border border-border/50 px-2 py-0.5 text-xs text-secondary-foreground font-medium">
              {indoor ? "Techada" : <><Sun className="h-3 w-3 text-orange-500" aria-hidden="true" /> Aire libre</>}
            </span>
            {hasLighting && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary/70 border border-border/50 px-2 py-0.5 text-xs text-secondary-foreground font-medium">
                <Lightbulb className="h-3 w-3 text-yellow-500" aria-hidden="true" /> Iluminación
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-semibold">
              <Clock className="h-3 w-3" aria-hidden="true" /> {slotDurationMinutes} min
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
