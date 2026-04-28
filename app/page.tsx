import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { CalendarCheck, MapPin, Search, Wallet, Users, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Ingresar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Hecho en Misiones
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
              Reservá tu cancha de <span className="text-primary">pádel</span> en segundos.
            </h1>
            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              Encontrá complejos cerca tuyo, mirá disponibilidad en tiempo real y asegurá tu turno con una seña. Pagás
              el resto en la cancha.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="text-base">
                <Link href="/auth/sign-up">Reservar ahora</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base bg-transparent">
                <Link href="/auth/sign-up?role=owner">Soy dueño de canchas</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Próximamente: tenis, fútbol 5, básquet y vóley en toda la provincia.
            </p>
          </div>

          {/* Hero card */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">Posadas, hoy</span>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  En vivo
                </span>
              </div>
              <CardContent className="flex flex-col gap-3 p-5">
                {[
                  { name: "Padel Club Itaembé", time: "19:00", price: "$8.000", available: true },
                  { name: "Misiones Padel Center", time: "20:00", price: "$9.500", available: true },
                  { name: "El Selvático", time: "21:00", price: "$7.500", available: false },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-card-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">Pádel · Cancha 1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-foreground">{c.time}</span>
                        <span className="text-xs text-muted-foreground">{c.price}</span>
                      </div>
                      <span
                        className={
                          c.available
                            ? "rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                            : "rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {c.available ? "Libre" : "Ocupado"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 className="mb-8 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Todo lo que necesitás para jugar
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Buscá en tiempo real",
                desc: "Disponibilidad actualizada al instante. No más llamados ni mensajes.",
              },
              {
                icon: CalendarCheck,
                title: "Asegurá tu turno",
                desc: "Pagás una seña digital y el resto lo abonás en la cancha.",
              },
              {
                icon: Wallet,
                title: "Sin sorpresas",
                desc: "Conocés el precio antes de reservar. Cancelás con anticipación si no podés ir.",
              },
            ].map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="leading-relaxed">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Para dueños */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 md:grid-cols-2 md:items-center md:p-10">
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Para dueños de canchas
            </div>
            <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Llená tus canchas todos los días
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Gestioná tu complejo, definí precios y horarios, y recibí reservas confirmadas con seña. Suscripción
              mensual sin comisiones por reserva.
            </p>
            <div>
              <Button asChild size="lg" variant="default">
                <Link href="/auth/sign-up?role=owner">Empezar prueba gratis</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              { icon: Users, label: "Reservas online 24/7" },
              { icon: CalendarCheck, label: "Calendario visual de turnos" },
              { icon: Wallet, label: "Cobro de seña digital automático" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <b.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row">
          <Logo showText />
          <p>&copy; {new Date().getFullYear()} CanchAR · Misiones, Argentina</p>
        </div>
      </footer>
    </main>
  )
}
