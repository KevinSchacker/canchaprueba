"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/suscripciones", label: "Suscripciones" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/complejos", label: "Complejos" },
  { href: "/admin/reservas", label: "Reservas" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="mx-auto max-w-6xl px-4">
      <ul className="flex gap-1 overflow-x-auto pb-2 pt-1 text-sm">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-block whitespace-nowrap rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
