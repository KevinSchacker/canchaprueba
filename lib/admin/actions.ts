"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" as const }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") return { ok: false, error: "Solo administradores" as const }
  return { ok: true as const, supabase, userId: user.id }
}

export async function upsertSubscription(formData: FormData) {
  const auth = await ensureAdmin()
  if (!auth.ok || !auth.supabase) return { error: auth.ok ? "Error interno" : auth.error }

  const ownerId = formData.get("owner_id") as string
  const status = formData.get("status") as string
  const plan = (formData.get("plan") as string) || "basic"
  const monthlyPrice = Number(formData.get("monthly_price") ?? 0)
  const periodEnd = formData.get("current_period_end") as string

  if (!ownerId || !status) return { error: "Faltan datos" }

  const { error } = await auth.supabase.from("owner_subscriptions").upsert(
    {
      owner_id: ownerId,
      status,
      plan,
      monthly_price: monthlyPrice,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
    },
    { onConflict: "owner_id" },
  )

  if (error) return { error: error.message }
  revalidatePath("/admin/suscripciones")
  return { ok: true }
}

export async function setSubscriptionStatus(formData: FormData) {
  const auth = await ensureAdmin()
  if (!auth.ok || !auth.supabase) return { error: auth.ok ? "Error interno" : auth.error }

  const ownerId = formData.get("owner_id") as string
  const status = formData.get("status") as string
  if (!ownerId || !status) return { error: "Faltan datos" }

  const { error } = await auth.supabase.from("owner_subscriptions").update({ status }).eq("owner_id", ownerId)

  if (error) return { error: error.message }
  revalidatePath("/admin/suscripciones")
  return { ok: true }
}

export async function setUserRole(formData: FormData) {
  const auth = await ensureAdmin()
  if (!auth.ok || !auth.supabase) return { error: auth.ok ? "Error interno" : auth.error }

  const userId = formData.get("user_id") as string
  const role = formData.get("role") as string
  if (!userId || !role) return { error: "Faltan datos" }

  const { error } = await auth.supabase.from("profiles").update({ role }).eq("id", userId)

  if (error) return { error: error.message }
  revalidatePath("/admin/usuarios")
  return { ok: true }
}

/**
 * ELIMINA TODAS LAS RESERVAS Y MOVIMIENTOS DE CAJA
 * Uso exclusivo para pruebas de desarrollo.
 */
export async function devOnlyClearAllBookings() {
  const auth = await ensureAdmin()
  if (!auth.ok || !auth.supabase) return { ok: false, error: auth.ok ? "Error interno" : auth.error }

  // 1. Eliminar reviews primero por FK
  await auth.supabase.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000") // Truco para borrar todo sin where id in
  
  // 2. Eliminar movimientos de caja
  await auth.supabase.from("cash_movements").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  // 3. Eliminar bookings
  const { error } = await auth.supabase
    .from("bookings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin")
  revalidatePath("/panel")
  return { ok: true }
}

export async function setVenueAllowedSports(formData: FormData) {
  const auth = await ensureAdmin()
  if (!auth.ok || !auth.supabase) return { error: auth.ok ? "Error interno" : auth.error }

  const venueId = formData.get("venue_id") as string
  const allowedSportsStr = formData.get("allowed_sports") as string
  
  if (!venueId || !allowedSportsStr) return { error: "Faltan datos" }

  let allowedSports: string[]
  try {
    allowedSports = JSON.parse(allowedSportsStr)
  } catch {
    return { error: "Formato inválido" }
  }

  const { error } = await auth.supabase
    .from("venues")
    .update({ allowed_sports: allowedSports })
    .eq("id", venueId)

  if (error) return { error: error.message }
  revalidatePath("/admin/complejos")
  return { ok: true }
}
