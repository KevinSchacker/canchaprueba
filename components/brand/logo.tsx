import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M3.5 12h17M12 3.5v17M5.5 5.5l13 13M18.5 5.5l-13 13" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Canch<span className="text-accent">AR</span>
        </span>
      )}
    </div>
  )
}
