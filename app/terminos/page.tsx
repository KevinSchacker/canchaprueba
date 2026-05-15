import Link from "next/link"
import { ArrowLeft, Shield, FileText, Clock, CreditCard, AlertTriangle, Users, Star, Lock } from "lucide-react"
import { Logo } from "@/components/brand/logo"

export const metadata = {
  title: "Términos y Condiciones · CanchAR",
  description:
    "Leé los términos y condiciones, política de cancelación, sistema de penalidades y políticas de uso de CanchAR.",
}

const LAST_UPDATED = "15 de mayo de 2026"

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Link>
          <Logo showText={false} />
          <span className="w-16" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {/* Hero */}
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Documento legal
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Términos y Condiciones
          </h1>
          <p className="text-muted-foreground text-sm">
            Última actualización: <span className="font-medium text-foreground">{LAST_UPDATED}</span>
          </p>
          <p className="text-base leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-4 mt-2">
            Al crear una cuenta y utilizar CanchAR, aceptás estos términos en su totalidad. 
            Te pedimos que los leas con atención ya que regulan tu relación con la plataforma.
          </p>
        </div>

        {/* TOC */}
        <nav className="mb-10 rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Contenido
          </p>
          <ol className="flex flex-col gap-2 text-sm">
            {[
              { href: "#quienes-somos", label: "1. Quiénes somos" },
              { href: "#uso-plataforma", label: "2. Uso de la plataforma" },
              { href: "#reservas", label: "3. Reservas y turnos" },
              { href: "#pagos", label: "4. Pagos y seña" },
              { href: "#cancelaciones", label: "5. Cancelaciones y reembolsos" },
              { href: "#penalidades", label: "6. Sistema de penalidades por ausencias" },
              { href: "#duenos", label: "7. Dueños de complejos" },
              { href: "#privacidad", label: "8. Privacidad y datos" },
              { href: "#responsabilidad", label: "9. Limitación de responsabilidad" },
              { href: "#contacto", label: "10. Contacto" },
            ].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-primary hover:underline underline-offset-4 transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-12 text-sm leading-relaxed text-foreground">

          {/* 1. Quiénes somos */}
          <section id="quienes-somos" className="scroll-mt-20">
            <SectionTitle icon={<Users className="h-5 w-5" />} number="1" title="Quiénes somos" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">CanchAR</strong> es una plataforma digital de reserva de canchas deportivas con sede en la provincia de Misiones, Argentina. Conecta a jugadores que buscan canchas disponibles con propietarios de complejos deportivos que ofrecen sus instalaciones.
              </p>
              <p>
                CanchAR actúa como <strong className="text-foreground">intermediario tecnológico</strong>: no es dueño de las canchas listadas en la plataforma ni es parte del contrato de uso entre el jugador y el complejo deportivo.
              </p>
            </div>
          </section>

          {/* 2. Uso */}
          <section id="uso-plataforma" className="scroll-mt-20">
            <SectionTitle icon={<Shield className="h-5 w-5" />} number="2" title="Uso de la plataforma" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>Para utilizar CanchAR necesitás:</p>
              <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
                <li>Tener al menos 18 años de edad o contar con autorización de un adulto responsable.</li>
                <li>Crear una cuenta con información verídica y mantenerla actualizada.</li>
                <li>No compartir tu cuenta con terceros.</li>
                <li>No usar la plataforma para fines fraudulentos, spam o actividades ilegales.</li>
              </ul>
              <p>
                CanchAR se reserva el derecho de suspender o eliminar cuentas que violen estas condiciones, sin previo aviso y sin reembolso de abonos vigentes.
              </p>
            </div>
          </section>

          {/* 3. Reservas */}
          <section id="reservas" className="scroll-mt-20">
            <SectionTitle icon={<Clock className="h-5 w-5" />} number="3" title="Reservas y turnos" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Al reservar un turno en CanchAR, se genera un <strong className="text-foreground">bloqueo temporal de 10 minutos</strong> sobre el horario seleccionado. Durante ese período, el turno queda reservado exclusivamente para vos mientras completás el pago de la seña.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-foreground">
                <p className="font-semibold mb-1">⏱ Importante — Ventana de 10 minutos</p>
                <p className="text-muted-foreground">
                  Si no completás el pago de la seña dentro de los <strong>10 minutos</strong> posteriores a la creación de la reserva, el sistema liberará automáticamente el turno para otros jugadores. Si intentás pagar después de ese plazo y nadie tomó el turno, el sistema lo recuperará; de lo contrario, recibirás un reembolso íntegro en caso de que el cargo ya hubiera sido procesado.
                </p>
              </div>
              <p>
                La reserva queda <strong className="text-foreground">confirmada</strong> únicamente cuando:
              </p>
              <ol className="list-decimal list-inside flex flex-col gap-1.5 pl-2">
                <li>El pago de la seña es acreditado exitosamente.</li>
                <li>El sistema actualiza el estado de la reserva a "Confirmada".</li>
                <li>Recibís una notificación de confirmación.</li>
              </ol>
            </div>
          </section>

          {/* 4. Pagos */}
          <section id="pagos" className="scroll-mt-20">
            <SectionTitle icon={<CreditCard className="h-5 w-5" />} number="4" title="Pagos y seña" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                CanchAR utiliza un sistema de <strong className="text-foreground">seña digital</strong>: al confirmar tu reserva, abonás un porcentaje del valor total del turno (definido por cada complejo, generalmente entre el 30% y el 50%). El saldo restante se abona directamente en el complejo el día del turno.
              </p>
              <p>
                Los pagos son procesados a través de <strong className="text-foreground">MercadoPago</strong>, sujeto a sus propios términos y condiciones. CanchAR no almacena datos de tarjetas de crédito ni débito.
              </p>
              <InfoBox color="amber">
                <p className="font-semibold text-amber-700 dark:text-amber-400">Seña especial — Pago del 100%</p>
                <p className="text-muted-foreground mt-1">
                  En ciertos casos (ver Sección 6 — Sistema de penalidades), el sistema puede requerir que abones el 100% del valor del turno como seña. En ese caso, no tendrás saldo a pagar en el complejo.
                </p>
              </InfoBox>
            </div>
          </section>

          {/* 5. Cancelaciones */}
          <section id="cancelaciones" className="scroll-mt-20">
            <SectionTitle icon={<AlertTriangle className="h-5 w-5" />} number="5" title="Cancelaciones y reembolsos" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Cada complejo define su propia política de cancelación (horas de anticipación requeridas y porcentaje de reembolso). Estas condiciones se muestran claramente en la página de cada cancha antes de confirmar la reserva.
              </p>
              <p>Reglas generales:</p>
              <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
                <li>
                  Si cancelás con la anticipación indicada por el complejo, recibirás el reembolso correspondiente según la política de ese complejo.
                </li>
                <li>
                  Si cancelás fuera del plazo, el complejo puede retener la seña total o parcialmente.
                </li>
                <li>
                  Si el <strong className="text-foreground">complejo cancela</strong> el turno por causas propias (fuerza mayor, mantenimiento, etc.), recibirás el 100% de la seña abonada.
                </li>
              </ul>
              <p>
                Los reembolsos se procesan a través de MercadoPago y pueden demorar entre 3 y 10 días hábiles en reflejarse en tu cuenta.
              </p>
            </div>
          </section>

          {/* 6. Penalidades */}
          <section id="penalidades" className="scroll-mt-20">
            <SectionTitle icon={<Star className="h-5 w-5" />} number="6" title="Sistema de penalidades por ausencias" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Para garantizar la integridad de la plataforma y el respeto hacia los complejos y otros jugadores, CanchAR implementa un sistema de penalidades basado en el historial de asistencia de cada jugador.
              </p>
              <p>El sistema opera en tres fases:</p>

              <div className="flex flex-col gap-3 mt-1">
                <PhaseCard
                  phase="Fase 1"
                  color="destructive"
                  title="Penalización (a partir de 3 ausencias)"
                  desc="Si acumulás 3 o más ausencias registradas en la plataforma (turno con estado 'Ausente'), serás penalizado. A partir de tu próxima reserva, el sistema te requerirá abonar el 100% del valor del turno como seña, independientemente del porcentaje configurado por el complejo."
                />
                <PhaseCard
                  phase="Fase 2"
                  color="amber"
                  title="Redención (4 asistencias consecutivas)"
                  desc="Si estando penalizado lográs asistir a 4 turnos consecutivos sin ausencias, el sistema levantará automáticamente la penalización. Volverás a abonar la seña estándar del complejo y entrarás en Tolerancia Cero (Fase 3)."
                />
                <PhaseCard
                  phase="Fase 3"
                  color="primary"
                  title="Tolerancia Cero (post-redención)"
                  desc="Una vez redimido, entrás en observación. Si registrás 1 sola ausencia nueva, el sistema te devuelve automáticamente a la Fase 1 (penalización del 100%), sin importar el tiempo transcurrido."
                />
              </div>

              <InfoBox color="neutral">
                <p className="text-muted-foreground">
                  El historial de asistencia es calculado en tiempo real a partir de tus reservas confirmadas. Los estados <strong className="text-foreground">"Completada"</strong> y <strong className="text-foreground">"Ausente"</strong> son asignados por el dueño del complejo después de cada turno.
                </p>
              </InfoBox>
            </div>
          </section>

          {/* 7. Dueños */}
          <section id="duenos" className="scroll-mt-20">
            <SectionTitle icon={<Users className="h-5 w-5" />} number="7" title="Dueños de complejos" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Los propietarios de complejos deportivos que usan CanchAR acceden a la plataforma mediante una <strong className="text-foreground">suscripción mensual</strong>. Sin suscripción activa, sus complejos y canchas no serán visibles para los jugadores.
              </p>
              <p>Los dueños son responsables de:</p>
              <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
                <li>Mantener actualizada la información de horarios, precios y disponibilidad de sus canchas.</li>
                <li>Marcar correctamente el estado de asistencia de los jugadores (Completada / Ausente) tras cada turno.</li>
                <li>Respetar las condiciones de cancelación configuradas en la plataforma.</li>
                <li>No bloquear turnos de forma arbitraria sin previo aviso al jugador.</li>
              </ul>
              <p>
                CanchAR puede suspender complejos que generen reiteradas disputas, no actualicen su información o incumplan las normas de la plataforma.
              </p>
            </div>
          </section>

          {/* 8. Privacidad */}
          <section id="privacidad" className="scroll-mt-20">
            <SectionTitle icon={<Lock className="h-5 w-5" />} number="8" title="Privacidad y datos" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                CanchAR recopila y procesa los datos necesarios para operar la plataforma: nombre, correo electrónico, historial de reservas y, a través de MercadoPago, datos de pago (que no almacenamos directamente).
              </p>
              <p>Tus datos:</p>
              <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
                <li>No son vendidos ni compartidos con terceros sin tu consentimiento, salvo exigencia legal.</li>
                <li>Son compartidos con el complejo que reservaste (nombre, contacto) para coordinar el turno.</li>
                <li>Pueden usarse de forma agregada y anónima para mejorar el servicio.</li>
              </ul>
              <p>
                Podés solicitar la eliminación de tu cuenta y datos en cualquier momento escribiéndonos a nuestro correo de contacto (ver Sección 10).
              </p>
            </div>
          </section>

          {/* 9. Responsabilidad */}
          <section id="responsabilidad" className="scroll-mt-20">
            <SectionTitle icon={<Shield className="h-5 w-5" />} number="9" title="Limitación de responsabilidad" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                CanchAR no garantiza la disponibilidad continua de la plataforma ni se responsabiliza por daños derivados de interrupciones del servicio, errores de terceros (procesadores de pago, servidores), o incumplimientos entre jugadores y complejos.
              </p>
              <p>
                La relación contractual por el uso de la cancha es exclusivamente entre el jugador y el complejo. CanchAR actúa como facilitador tecnológico.
              </p>
            </div>
          </section>

          {/* 10. Contacto */}
          <section id="contacto" className="scroll-mt-20">
            <SectionTitle icon={<FileText className="h-5 w-5" />} number="10" title="Contacto" />
            <div className="flex flex-col gap-3 text-muted-foreground">
              <p>
                Si tenés dudas, consultas o quejas sobre estos términos, podés contactarnos:
              </p>
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                <p className="font-semibold text-foreground">CanchAR — Soporte</p>
                <p>📧 soporte@canchar.com.ar</p>
                <p>📍 Misiones, Argentina</p>
              </div>
              <p>
                CanchAR se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados en la plataforma con al menos 7 días de anticipación.
              </p>
            </div>
          </section>
        </div>

        {/* Back to top */}
        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <a href="#" className="text-primary hover:underline underline-offset-4">
            ↑ Volver al inicio del documento
          </a>
          <p className="mt-4">
            ¿Tenés una cuenta?{" "}
            <Link href="/play" className="text-primary hover:underline underline-offset-4 font-medium">
              Ir a la app
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 text-xs text-muted-foreground">
          <Logo showText />
          <span>© {new Date().getFullYear()} CanchAR · Misiones, Argentina</span>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon, number, title }: { icon: React.ReactNode; number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        <span className="text-muted-foreground font-normal">{number}. </span>
        {title}
      </h2>
    </div>
  )
}

function InfoBox({ children, color }: { children: React.ReactNode; color: "amber" | "neutral" }) {
  const styles =
    color === "amber"
      ? "border-amber-400/30 bg-amber-500/5"
      : "border-border bg-secondary/40"
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  )
}

function PhaseCard({
  phase,
  color,
  title,
  desc,
}: {
  phase: string
  color: "destructive" | "amber" | "primary"
  title: string
  desc: string
}) {
  const styles = {
    destructive: "border-destructive/30 bg-destructive/5",
    amber: "border-amber-400/30 bg-amber-500/5",
    primary: "border-primary/30 bg-primary/5",
  }
  const labelStyles = {
    destructive: "text-destructive bg-destructive/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    primary: "text-primary bg-primary/10",
  }
  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-col gap-1.5 ${styles[color]}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${labelStyles[color]}`}>
          {phase}
        </span>
        <span className="font-semibold text-foreground text-sm">{title}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
    </div>
  )
}
