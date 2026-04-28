import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SubscriptionForm } from "@/components/admin/subscription-form"
import { SetSubStatusButtons } from "@/components/admin/set-sub-status"

export default async function SuscripcionesPage() {
  const supabase = await createClient()

  // Todos los owners
  const { data: owners } = await supabase
    .from("profiles")
    .select("id, full_name, phone, city")
    .eq("role", "owner")
    .order("created_at", { ascending: false })

  const { data: subs } = await supabase.from("owner_subscriptions").select("*")
  const subByOwner = new Map((subs ?? []).map((s) => [s.owner_id, s]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suscripciones de dueños</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná el estado y monto mensual de cada dueño. Mientras integramos MercadoPago Suscripciones, podés
          activar/desactivar manualmente.
        </p>
      </div>

      <div className="grid gap-3">
        {(!owners || owners.length === 0) && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Todavía no hay dueños registrados.</CardContent>
          </Card>
        )}

        {owners?.map((o) => {
          const sub = subByOwner.get(o.id)
          return (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span>{o.full_name || "Sin nombre"}</span>
                  <Badge variant={statusVariant(sub?.status)}>{sub?.status ?? "sin suscripción"}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {o.city ? `${o.city} · ` : ""}
                  {o.phone || "sin teléfono"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Plan</div>
                    <div className="font-medium">{sub?.plan ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Mensual</div>
                    <div className="font-medium">
                      {sub ? `$${Number(sub.monthly_price).toLocaleString("es-AR")}` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Próx. vencimiento</div>
                    <div className="font-medium">
                      {sub?.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString("es-AR")
                        : "—"}
                    </div>
                  </div>
                </div>

                <SubscriptionForm
                  ownerId={o.id}
                  defaultStatus={sub?.status ?? "trial"}
                  defaultPlan={sub?.plan ?? "basic"}
                  defaultPrice={sub ? Number(sub.monthly_price) : 0}
                  defaultPeriodEnd={sub?.current_period_end ?? null}
                />

                {sub && <SetSubStatusButtons ownerId={o.id} currentStatus={sub.status} />}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function statusVariant(status?: string) {
  switch (status) {
    case "active":
      return "default" as const
    case "trial":
      return "secondary" as const
    case "past_due":
      return "destructive" as const
    case "paused":
    case "cancelled":
      return "outline" as const
    default:
      return "outline" as const
  }
}
