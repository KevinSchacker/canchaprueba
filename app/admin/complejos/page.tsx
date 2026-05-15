import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { VenueSportsManager } from "@/components/admin/venue-sports-manager"

export const dynamic = "force-dynamic"

export default async function ComplejosPage() {
  const supabase = await createClient()
  
  // Obtenemos todos los deportes
  const { data: allSports } = await supabase.from("sports").select("id, slug, name").order("name")
  
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, city, address, active, allowed_sports, profiles!venues_owner_id_fkey(full_name), courts(id)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Complejos</h1>
        <p className="text-sm text-muted-foreground">Listado de todos los complejos cargados en la plataforma.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {venues?.map((v: any) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{v.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {v.city} · {v.address}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Dueño: {v.profiles?.full_name || "—"} · {v.courts?.length ?? 0} cancha(s)
                  </div>
                </div>
                <Badge variant={v.active ? "default" : "outline"}>{v.active ? "Activo" : "Inactivo"}</Badge>
                
                <VenueSportsManager 
                  venueId={v.id} 
                  allSports={allSports || []} 
                  allowedSports={v.allowed_sports} 
                />
              </li>
            ))}
            {(!venues || venues.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">Aún no hay complejos cargados.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
