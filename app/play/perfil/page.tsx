import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { BottomNav } from "@/components/play/bottom-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, User } from "lucide-react"

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

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Mi perfil</h1>

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
          </CardContent>
        </Card>
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
