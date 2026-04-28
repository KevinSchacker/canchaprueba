"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { upsertVenue } from "@/lib/owner/actions"
import { useRouter } from "next/navigation"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

type VenueInitial = {
  id: string
  name: string
  description: string
  address: string
  city: string
  phone: string
  coverImageUrl: string
} | null

export function VenueForm({ initial }: { initial: VenueInitial }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "Posadas",
    phone: initial?.phone ?? "",
    coverImageUrl: initial?.coverImageUrl ?? "",
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const res = await upsertVenue({
        id: initial?.id,
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        phone: form.phone,
        coverImageUrl: form.coverImageUrl,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSuccess("Datos del complejo guardados.")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nombre del complejo</FieldLabel>
              <Input
                id="name"
                required
                placeholder="Pádel Club Itaembé"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Descripción</FieldLabel>
              <Input
                id="description"
                placeholder="Canchas profesionales, vestuarios, buffet..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="address">Dirección</FieldLabel>
                <Input
                  id="address"
                  required
                  placeholder="Av. Quaranta 5500"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="city">Ciudad</FieldLabel>
                <Input
                  id="city"
                  required
                  placeholder="Posadas"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <Input
                  id="phone"
                  placeholder="+54 376 412 3456"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cover">Imagen de portada (URL)</FieldLabel>
                <Input
                  id="cover"
                  type="url"
                  placeholder="https://..."
                  value={form.coverImageUrl}
                  onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                />
              </Field>
            </div>
          </FieldGroup>

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary" role="status">
              {success}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Spinner /> Guardando...
                </>
              ) : initial ? (
                "Guardar cambios"
              ) : (
                "Crear complejo"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
