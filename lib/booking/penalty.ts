import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Calculates whether a player must pay 100% of the deposit as a penalty.
 * Penalty conditions:
 * - If the player has >= 4 `no_show` bookings historically, they are penalized (100% deposit).
 * - Redemption: If their LAST 3 completed/past bookings (since the last no_show) are "completed", the penalty is removed.
 * - If they get another no_show, the streak breaks and they are penalized again.
 */
export async function checkPlayerPenalty(supabase: SupabaseClient, playerId: string): Promise<boolean> {
  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("status")
    .eq("player_id", playerId)
    // Solo traemos estados que indican que el turno pasó o fue falta
    .in("status", ["completed", "no_show"])
    .order("start_time", { ascending: false })

  if (!pastBookings || pastBookings.length === 0) {
    return false
  }

  let noShowCount = 0
  let consecutiveCompleted = 0
  let brokenStreak = false

  for (const b of pastBookings) {
    if (b.status === "no_show") {
      noShowCount++
      brokenStreak = true // Ya encontramos un no_show, cortamos la racha buena actual
    } else if (b.status === "completed" && !brokenStreak) {
      consecutiveCompleted++
    }
  }

  const NO_SHOW_THRESHOLD = 4

  if (noShowCount >= NO_SHOW_THRESHOLD) {
    // Si llegó a 4 o más faltas, evaluamos la redención
    // ¿Cumplió las últimas 3 veces seguidas sin faltar?
    if (consecutiveCompleted >= 3) {
      return false // Redimido
    }
    return true // Penalizado
  }

  return false
}
