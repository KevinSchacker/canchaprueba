export type DaySchedule = { enabled: boolean; openTime: string; closeTime: string }

export function buildDefaultSchedules(): DaySchedule[] {
  return Array.from({ length: 7 }, () => ({ enabled: true, openTime: "09:00", closeTime: "23:00" }))
}

export function buildSchedulesFromInitial(initial: { dayOfWeek: number; openTime: string; closeTime: string }[]): DaySchedule[] {
  const days: DaySchedule[] = Array.from({ length: 7 }, () => ({ enabled: false, openTime: "09:00", closeTime: "23:00" }))
  for (const s of initial) {
    days[s.dayOfWeek] = { enabled: true, openTime: s.openTime.slice(0, 5), closeTime: s.closeTime.slice(0, 5) }
  }
  return days
}
