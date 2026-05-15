import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Calculates whether a player must pay 100% of the deposit as a penalty.
 * 
 * Phase 1 (Penalty): 3 accumulated `no_show` activates penalty (pay 100%).
 * Phase 2 (Redemption): After penalized, completing 4 bookings lifts the penalty.
 * Phase 3 (Zero Tolerance): After redemption, 1 miss returns to Phase 1 immediately.
 */
export async function checkPlayerPenalty(supabase: SupabaseClient, playerId: string): Promise<boolean> {
  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("status")
    .eq("player_id", playerId)
    // Solo traemos completadas o faltas para la lógica
    .in("status", ["completed", "no_show"])
    .order("start_time", { ascending: true }) // CRUCIAL: Ascendente para simular el historial

  if (!pastBookings || pastBookings.length === 0) {
    return false
  }

  let misses = 0
  let isPenalized = false
  let redemptionStreak = 0
  let isZeroTolerance = false

  for (const b of pastBookings) {
    if (b.status === "no_show") {
      if (isZeroTolerance) {
        // Fase 3 -> Fase 1 directo
        isPenalized = true
        isZeroTolerance = false
        redemptionStreak = 0
      } else if (isPenalized) {
        // Si ya estaba penalizado, rompe la racha de redención
        redemptionStreak = 0
      } else {
        // Acumulando faltas
        misses++
        if (misses >= 3) {
          isPenalized = true
        }
      }
    } else if (b.status === "completed") {
      if (isPenalized) {
        redemptionStreak++
        if (redemptionStreak >= 4) {
          // Fase 2 -> Fase 3
          isPenalized = false
          isZeroTolerance = true
          redemptionStreak = 0
          misses = 0 // Opcional, pero reseteamos para estado limpio si pierde la tolerancia
        }
      }
    }
  }

  return isPenalized
}
