import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { BottomNav } from "@/components/play/bottom-nav"
import { PlayHeader } from "@/components/play/play-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, User, Star } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, city")
    .eq("id", user.id)
    .maybeSingle()

  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      id, rating, comment, created_at,
      bookings ( courts ( name, venues ( name ) ) )
    `)
    .eq("reviewee_type", "player")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false })

  const averageRating = reviews?.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "Sin calificaciones"

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PlayHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mi perfil</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/play/perfil/editar">Editar perfil</Link>
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{profile?.full_name ?? "Sin nombre"}</CardTitle>
              <CardDescription className="capitalize">
                {profile?.role === "player" ? "Jugador" : profile?.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Row icon={<Mail className="h-4 w-4 text-accent" />} label="Email" value={user.email ?? "—"} />
              <Row icon={<User className="h-4 w-4 text-accent" />} label="Ciudad" value={profile?.city ?? "—"} />
              <Row icon={<Star className="h-4 w-4 text-accent" />} label="Calificación Promedio" value={averageRating} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reseñas de dueños</CardTitle>
              <CardDescription>Lo que dicen los dueños de canchas sobre vos.</CardDescription>
            </CardHeader>
            <CardContent>
              {!reviews || reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no recibiste reseñas.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {reviews.map((r: any) => (
                    <li key={r.id} className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {r.bookings?.courts?.venues?.name ?? "Complejo"} - {r.bookings?.courts?.name ?? "Cancha"}
                        </span>
                        <div className="flex items-center gap-1 text-accent">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-accent" : "text-muted opacity-50"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground mt-1">"{r.comment}"</p>}
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString("es-AR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  )
}
