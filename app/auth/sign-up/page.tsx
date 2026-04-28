"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/brand/logo"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Trophy, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "player" | "owner"

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<Role>("player")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initial = searchParams.get("role")
    if (initial === "owner" || initial === "player") {
      setRole(initial)
    }
  }, [searchParams])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error al crear la cuenta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Link href="/" aria-label="Inicio">
        <Logo />
      </Link>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Crear cuenta</CardTitle>
            <CardDescription>Empezá a usar CanchAR en Misiones</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="flex flex-col gap-5">
              {/* Selector de rol */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("player")}
                  aria-pressed={role === "player"}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    role === "player"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Jugador</span>
                  <span className="text-xs text-muted-foreground">Quiero reservar canchas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("owner")}
                  aria-pressed={role === "owner"}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    role === "owner"
                      ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Dueño</span>
                  <span className="text-xs text-muted-foreground">Tengo canchas para alquilar</span>
                </button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fullName">Nombre y apellido</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="vos@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repetir contraseña</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  minLength={6}
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{" "}
                <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Ingresar
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  )
}
