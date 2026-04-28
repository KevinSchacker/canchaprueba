import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Link href="/" aria-label="Inicio">
        <Logo />
      </Link>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Algo salió mal</CardTitle>
            <CardDescription>No pudimos completar la operación</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {params?.error ? (
              <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{params.error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ocurrió un error inesperado. Probá nuevamente.</p>
            )}
            <Button asChild>
              <Link href="/auth/login">Volver a ingresar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
