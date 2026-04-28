"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, CalendarCheck, User } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/play", label: "Buscar", icon: Search, exact: true },
  { href: "/play/mis-reservas", label: "Reservas", icon: CalendarCheck, exact: false },
  { href: "/play/perfil", label: "Perfil", icon: User, exact: false },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href)
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <it.icon className="h-5 w-5" aria-hidden="true" />
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
