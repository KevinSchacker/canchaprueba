import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CourtForm } from "@/components/owner/court-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function NewCourtPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venue } = await supabase.from("venues").select("id").eq("owner_id", user!.id).maybeSingle()
  if (!venue) redirect("/panel/complejo")

  const { data: sports } = await supabase.from("sports").select("id, slug, name, active").order("name")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/panel/canchas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a canchas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Nueva cancha</h1>
        <p className="text-sm text-muted-foreground">Configurá nombre, precio, características y horarios.</p>
      </div>

      <CourtForm venueId={venue.id} sports={sports ?? []} initial={null} />
    </div>
  )
}
