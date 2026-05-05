"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { submitRating } from "@/lib/booking/ratings"
import { Star } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function RateBookingDialog({ 
  bookingId, 
  revieweeType, 
  revieweeId, 
  title 
}: { 
  bookingId: string
  revieweeType: "court" | "player"
  revieweeId: string
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = () => {
    if (rating === 0) return
    setError(null)
    startTransition(async () => {
      const res = await submitRating({ bookingId, rating, comment, revieweeType, revieweeId })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Calificar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none"
              >
                <Star
                  className={cn(
                    "size-8 transition-colors",
                    (hoverRating || rating) >= star ? "fill-primary text-primary" : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Dejá un comentario (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
            rows={3}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button disabled={rating === 0 || pending} onClick={onSubmit}>
            {pending ? <><Spinner className="mr-2" /> Enviando...</> : "Enviar calificación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
