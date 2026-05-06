"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ImagePlus, X, GripVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type CourtImage = {
  id?: string
  url: string
  position: number
}

interface Props {
  initialImages: CourtImage[]
  onChange: (images: CourtImage[]) => void
  maxImages?: number
}

export function CourtImagesUpload({ initialImages, onChange, maxImages = 6 }: Props) {
  const [images, setImages] = useState<CourtImage[]>(initialImages)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFiles = async (files: FileList) => {
    if (images.length >= maxImages) return
    
    setUploading(true)
    const newImages = [...images]
    
    for (const file of Array.from(files)) {
      if (newImages.length >= maxImages) break
      
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `courts/${fileName}`

      const { data, error } = await supabase.storage
        .from("court-images")
        .upload(filePath, file)

      if (error) {
        console.error("Error uploading image:", error.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from("court-images")
        .getPublicUrl(filePath)

      newImages.push({
        url: publicUrl,
        position: newImages.length
      })
    }

    setImages(newImages)
    onChange(newImages)
    setUploading(false)
  }

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({ ...img, position: i }))
    setImages(updated)
    onChange(updated)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-4">
      {/* Grid de imágenes */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <div 
            key={i} 
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-all hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={img.url} 
              alt={`Foto ${i + 1}`} 
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
              title="Eliminar imagen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                Principal
              </span>
            )}
          </div>
        ))}

        {/* Botón de upload */}
        {images.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/30 transition-all hover:border-primary/50 hover:bg-secondary/50 disabled:opacity-50",
              dragActive && "border-primary bg-primary/5 ring-4 ring-primary/10",
              uploading && "cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Spinner className="h-8 w-8 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Subiendo...</span>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <span className="block text-xs font-semibold text-foreground">Añadir fotos</span>
                  <span className="block text-[10px] text-muted-foreground">{images.length}/{maxImages} máx.</span>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <p className="text-[11px] text-muted-foreground italic">
        * Arrastrá las imágenes para reordenarlas (próximamente). La primera imagen será la principal.
      </p>
    </div>
  )
}
