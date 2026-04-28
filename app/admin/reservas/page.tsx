import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ReservasAdminPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, start_time, end_time, status, total_price, deposit_paid, courts(name, venues(name)), profiles!bookings_player_id_fkey(full_name)",
    )
    .order("start_time", { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservas</h1>
        <p className="text-sm text-muted-foreground">Últimas 100 reservas de la plataforma.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {bookings?.map((b: any) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">
                    {b.courts?.venues?.name ?? "—"} · {b.courts?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.start_time).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · {b.profiles?.full_name || "Sin nombre"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.deposit_paid && <Badge variant="secondary">Seña paga</Badge>}
                  <Badge>{b.status}</Badge>
                  <span className="font-medium">${Number(b.total_price).toLocaleString("es-AR")}</span>
                </div>
              </li>
            ))}
            {(!bookings || bookings.length === 0) && (
              <li className="p-6 text-sm text-muted-foreground">Sin reservas todavía.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
