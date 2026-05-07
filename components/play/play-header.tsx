"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/brand/logo"
import { LogoutButton } from "@/components/auth/logout-button"
import { Button } from "@/components/ui/button"
import { CalendarCheck, Search, User } from "lucide-react"

export function PlayHeader() {
  const pathname = usePathname()

  const links = [
    { href: "/play", label: "Buscar", icon: Search },
    { href: "/play/mis-reservas", label: "Mis Reservas", icon: CalendarCheck },
    { href: "/play/perfil", label: "Perfil", icon: User },
  ]

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const active = link.href === "/play" ? pathname === "/play" : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <LogoutButton />
      </div>
    </header>
  )
}
