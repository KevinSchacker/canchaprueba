import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const adminDb = createAdminClient()

  // Get all profiles
  const { data: profiles, error: profilesError } = await adminDb
    .from("profiles")
    .select("id, full_name, phone, role")
    .limit(20)

  // Get all reviews
  const { data: reviews, error: reviewsError } = await adminDb
    .from("reviews")
    .select("id, player_id, reviewee_type, rating, reviewer_id")
    .limit(20)

  // Get all bookings
  const { data: bookings, error: bookingsError } = await adminDb
    .from("bookings")
    .select("id, player_id, court_id, status")
    .limit(20)

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", fontSize: "12px" }}>
      <h1>DEBUG - Profiles</h1>
      <pre style={{ background: "#111", color: "#0f0", padding: "1rem", overflow: "auto" }}>
        {JSON.stringify({ profiles, profilesError }, null, 2)}
      </pre>

      <h1>DEBUG - Reviews</h1>
      <pre style={{ background: "#111", color: "#0f0", padding: "1rem", overflow: "auto" }}>
        {JSON.stringify({ reviews, reviewsError }, null, 2)}
      </pre>

      <h1>DEBUG - Bookings</h1>
      <pre style={{ background: "#111", color: "#0f0", padding: "1rem", overflow: "auto" }}>
        {JSON.stringify({ bookings, bookingsError }, null, 2)}
      </pre>
    </div>
  )
}
