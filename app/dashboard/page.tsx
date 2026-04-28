import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Router según rol. Esta página se usa como punto de entrada después del login
 * y redirige al panel correspondiente:
 * - player → /play (búsqueda y reservas)
 * - owner  → /panel (gestión de complejo)
 * - admin  → /admin (gestión de suscripciones)
 */
export default async function DashboardRouterPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

  const role = profile?.role ?? "player"

  if (role === "admin") {
    redirect("/admin")
  }
  if (role === "owner") {
    redirect("/panel")
  }
  redirect("/play")
}
