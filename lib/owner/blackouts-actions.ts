"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    redirect("/dashboard")
  }
  return { supabase, userId: user.id }
}

export type BlackoutInput = {
  courtId: string
  startTime: string // ISO
  endTime: string // ISO
  reason?: string
}

export async function createBlackout(input: BlackoutInput) {
  const { supabase, userId } = await requireOwner()

  // Verificar ownership de la cancha
  const { data: court } = await supabase
    .from("courts")
    .select("id, venues!inner ( owner_id )")
    .eq("id", input.courtId)
    .maybeSingle()
  type Check = { id: string; venues: { owner_id: string } }
  const c = court as unknown as Check | null
  if (!c || c.venues.owner_id !== userId) {
    return { ok: false as const, error: "No tenés permisos sobre esta cancha." }
  }

  if (new Date(input.endTime) <= new Date(input.startTime)) {
    return { ok: false as const, error: "El fin debe ser posterior al inicio." }
  }

  const { error } = await supabase.from("court_blackouts").insert({
    court_id: input.courtId,
    start_time: input.startTime,
    end_time: input.endTime,
    reason: input.reason || null,
  })
  if (error) return { ok: false as const, error: error.message }

  revalidatePath(`/panel/canchas/${input.courtId}/bloqueos`)
  revalidatePath("/panel")
  return { ok: true as const }
}

export async function deleteBlackout(blackoutId: string) {
  const { supabase } = await requireOwner()
  const { data: row } = await supabase
    .from("court_blackouts")
    .select("court_id")
    .eq("id", blackoutId)
    .maybeSingle()
  const { error } = await supabase.from("court_blackouts").delete().eq("id", blackoutId)
  if (error) return { ok: false as const, error: error.message }
  if (row?.court_id) revalidatePath(`/panel/canchas/${row.court_id}/bloqueos`)
  return { ok: true as const }
}
