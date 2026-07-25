import { createFileRoute, Link } from "@tanstack/react-router";
import { PiggyBank, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Armoney — Banco digital das crianças" },
      { name: "description", content: "Cadastre crianças, gerencie saldos e metas em um app colorido e seguro." },
      { property: "og:title", content: "Armoney — Banco digital das crianças" },
      { property: "og:description", content: "Cadastre crianças, gerencie saldos e metas em um app colorido e seguro." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <header className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-coral text-white shadow-pop">
            <PiggyBank className="size-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Armoney</div>
            <div className="text-xs text-muted-foreground">Banco digital infantil</div>
          </div>
        </header>

        <section className="mt-16 grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="size-3" /> Feito para famílias divertidas
            </div>
            <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              O primeiro <span className="bg-gradient-sunset bg-clip-text text-transparent">banco</span> das crianças.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              O administrador cria as contas, faz depósitos e saques.
              Cada criança acessa sua conta com usuário e PIN, acompanha saldo, cartão virtual, QR Code e metas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/kid/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-coral px-6 py-4 text-base font-semibold text-white shadow-pop transition hover:-translate-y-0.5"
              >
                Sou uma criança
              </Link>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-foreground shadow-card ring-1 ring-border transition hover:-translate-y-0.5"
              >
                <ShieldCheck className="size-4" /> Sou o administrador
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="animate-float rounded-3xl bg-gradient-sunset p-8 text-white shadow-pop">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-80">
                <span>Armoney Kids</span>
                <span>VISA*</span>
              </div>
              <div className="mt-10 text-3xl font-bold tracking-wide">R$ 128,50</div>
              <div className="mt-1 text-sm opacity-80">Saldo disponível</div>
              <div className="mt-8 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase opacity-70">Titular</div>
                  <div className="text-lg font-semibold">Ana Beatriz</div>
                </div>
                <div className="text-4xl">🐷</div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rotate-[-6deg] rounded-2xl bg-white p-4 shadow-card md:block">
              <div className="text-xs text-muted-foreground">Meta: Bicicleta</div>
              <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-gradient-mint" />
              </div>
              <div className="mt-2 text-sm font-semibold">R$ 200 / R$ 300</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
