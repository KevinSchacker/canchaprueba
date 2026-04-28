import { createClient } from "@/lib/supabase/server"
import { VenueForm } from "@/components/owner/venue-form"

export const dynamic = "force-dynamic"

export default async function VenuePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, description, address, city, phone, cover_image_url")
    .eq("owner_id", user!.id)
    .order("created_at")
    .limit(1)
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Mi complejo</h1>
        <p className="text-sm text-muted-foreground">
          Datos generales que verán los jugadores al buscar canchas.
        </p>
      </div>

      <VenueForm
        initial={
          venue
            ? {
                id: venue.id,
                name: venue.name,
                description: venue.description ?? "",
                address: venue.address,
                city: venue.city,
                phone: venue.phone ?? "",
                coverImageUrl: venue.cover_image_url ?? "",
              }
            : null
        }
      />
    </div>
  )
}
