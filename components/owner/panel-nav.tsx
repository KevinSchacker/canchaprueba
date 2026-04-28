"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Building2, CircleDot, CalendarCheck, Repeat } from "lucide-react"

const items = [
  { href: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/panel/complejo", label: "Complejo", icon: Building2 },
  { href: "/panel/canchas", label: "Canchas", icon: CircleDot },
  { href: "/panel/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/panel/fijos", label: "Fijos", icon: Repeat },
]

export function PanelNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Secciones del panel">
      <ul className="flex gap-1 overflow-x-auto">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="h-4 w-4" aria-hidden="true" />
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
