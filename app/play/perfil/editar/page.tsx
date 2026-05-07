import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { PlayHeader } from "@/components/play/play-header"
import { BottomNav } from "@/components/play/bottom-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { revalidatePath } from "next/cache"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city, phone")
    .eq("id", user.id)
    .maybeSingle()

  async function updateProfile(formData: FormData) {
    "use server"
    
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    
    if (!user) return

    const fullName = (formData.get("fullName") as string).trim()
    const city = (formData.get("city") as string).trim()
    const phone = (formData.get("phone") as string).trim()

    // Usar admin para garantizar que el update siempre funcione
    const adminDb = createAdminClient()
    await adminDb
      .from("profiles")
      .update({
        full_name: fullName || null,
        city: city || null,
        phone: phone || null,
      })
      .eq("id", user.id)

    revalidatePath("/play/perfil")
    redirect("/play/perfil")
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PlayHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Editar perfil</h1>

        <Card>
          <CardHeader>
            <CardTitle>Tus datos personales</CardTitle>
            <CardDescription>Actualizá tu información para que los dueños de canchas puedan contactarte.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={profile?.full_name ?? ""}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={profile?.city ?? ""}
                  placeholder="Oberá, Misiones"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile?.phone ?? ""}
                  placeholder="+54 9 3755 123456"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <Button asChild variant="outline">
                  <Link href="/play/perfil">Cancelar</Link>
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
