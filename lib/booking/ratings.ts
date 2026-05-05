"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitRating(input: {
  bookingId: string
  rating: number
  comment?: string
  revieweeType: "court" | "player"
  revieweeId: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const { error } = await supabase.from("reviews").insert({
    booking_id: input.bookingId,
    reviewer_id: user.id,
    reviewee_type: input.revieweeType,
    court_id: input.revieweeType === "court" ? input.revieweeId : null,
    player_id: input.revieweeType === "player" ? input.revieweeId : null,
    rating: input.rating,
    comment: input.comment,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ya calificaste esta reserva." }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath("/play/mis-reservas")
  revalidatePath("/panel/reservas")
  
  return { ok: true }
}
