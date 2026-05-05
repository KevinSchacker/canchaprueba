import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { PanelNav } from "@/components/owner/panel-nav"
import { FullPCFooter } from "@/components/brand/fullpc-footer"

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
  if (profile?.role === "player") redirect("/play")
  if (profile?.role === "admin") redirect("/admin")

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent sm:inline">
              Panel del dueño
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile?.full_name?.split(" ")[0] ?? ""}
            </span>
            <LogoutButton />
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4">
            <PanelNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      
      <FullPCFooter />
    </div>
  )
}
