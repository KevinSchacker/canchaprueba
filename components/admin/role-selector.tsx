"use client"

import { useTransition } from "react"
import { setUserRole } from "@/lib/admin/actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [isPending, startTransition] = useTransition()

  function onChange(role: string) {
    if (role === currentRole) return
    const fd = new FormData()
    fd.set("user_id", userId)
    fd.set("role", role)
    startTransition(async () => {
      const res = await setUserRole(fd)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <Select value={currentRole} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="player">Jugador</SelectItem>
        <SelectItem value="owner">Dueño</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  )
}
