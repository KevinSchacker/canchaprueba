import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import Link from "next/link"
import { Mail } from "lucide-react"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Link href="/" aria-label="Inicio">
        <Logo />
      </Link>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Revisá tu correo</CardTitle>
            <CardDescription>Te enviamos un link para confirmar tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Hacé click en el enlace de confirmación que te enviamos por email. Una vez confirmada tu cuenta, vas a
              poder ingresar y empezar a reservar.
            </p>
            <Button asChild variant="outline">
              <Link href="/auth/login">Volver a ingresar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
