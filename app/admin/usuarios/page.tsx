import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoleSelector } from "@/components/admin/role-selector"

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, city, role, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Cambiá el rol de cualquier usuario.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {profiles?.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.full_name || "Sin nombre"}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.city || "—"} · {p.phone || "sin teléfono"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{p.role}</Badge>
                  <RoleSelector userId={p.id} currentRole={p.role} />
                </div>
              </li>
            ))}
            {(!profiles || profiles.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">Sin usuarios todavía.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
