"use client"

import { useState, useTransition, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { upsertVenue } from "@/lib/owner/actions"
import { useRouter } from "next/navigation"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Upload, X, ImageIcon, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type VenueInitial = {
  id: string
  name: string
  description: string
  address: string
  city: string
  phone: string
  coverImageUrl: string
} | null

const AMENITIES = [
  { id: "parrilla", label: "🔥 Parrilla" },
  { id: "duchas", label: "🚿 Vestuarios / Duchas" },
  { id: "estacionamiento", label: "🅿️ Estacionamiento" },
  { id: "wifi", label: "📶 WiFi" },
  { id: "buffet", label: "🍔 Buffet / Cantina" },
  { id: "tribuna", label: "🪑 Tribuna / Gradas" },
  { id: "iluminacion", label: "💡 Iluminación nocturna" },
  { id: "acceso_discapacitados", label: "♿ Acceso sin escalones" },
  { id: "alquiler_equipamiento", label: "🎾 Alquiler de equipamiento" },
]

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

  // Amenities
  const [amenities, setAmenities] = useState<string[]>([])

  // Preview de imagen (local)
  const [imagePreview, setImagePreview] = useState<string>(initial?.coverImageUrl ?? "")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se aceptan imágenes (JPG, PNG, WEBP).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5MB.")
      return
    }
    setError(null)
    // Mostrar preview local mientras sube
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      // TODO: subir a Supabase Storage o Cloudinary en producción
      // Por ahora guardamos el data URL temporalmente
      setForm((f) => ({ ...f, coverImageUrl: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

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

            <Field>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <Input
                id="phone"
                placeholder="+54 376 412 3456"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>

            {/* ── Foto de portada — Drag & Drop ── */}
            <Field>
              <FieldLabel>Foto de portada</FieldLabel>
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50 cursor-pointer",
                  uploadingImage && "opacity-70 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                />
                {imagePreview ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview portada"
                      className="mx-auto h-32 w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImagePreview("")
                        setForm((f) => ({ ...f, coverImageUrl: "" }))
                      }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground">Clic o arrastrar para cambiar la foto</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Subí una foto o arrastrá acá</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — máx. 5MB</p>
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                      <Upload className="h-3.5 w-3.5" />
                      Seleccionar archivo
                    </div>
                  </>
                )}
              </div>
            </Field>

            {/* ── Amenidades / Comodidades ── */}
            <Field>
              <FieldLabel>Comodidades del complejo</FieldLabel>
              <p className="mb-3 text-xs text-muted-foreground">
                Marcá qué ofrece tu complejo. Esto se muestra a los jugadores en el marketplace.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMENITIES.map(({ id, label }) => {
                  const checked = amenities.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleAmenity(id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors text-left",
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/50"
                      )}
                    >
                      <span className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}>
                        {checked && <Check className="h-2.5 w-2.5" />}
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>
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
