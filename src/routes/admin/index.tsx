import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getDashboardStats, listChildren, createChild, isAdminCheck,
} from "@/lib/armoney.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/kid-session";
import {
  PiggyBank, Users, Wallet, ArrowDownCircle, ArrowUpCircle, LogOut, Plus, Search,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Armoney" },
      { name: "description", content: "Painel administrativo do Armoney." },
      { property: "og:title", content: "Dashboard Armoney" },
      { property: "og:description", content: "Gerencie crianças, saldos e metas." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const check = useServerFn(isAdminCheck);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/admin/login" }); return; }
      try {
        const r = await check();
        if (!r.isAdmin) { toast.error("Você não é administrador."); navigate({ to: "/admin/login" }); return; }
        setReady(true);
      } catch { navigate({ to: "/admin/login" }); }
    })();
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  return <Dashboard />;
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => getDashboardStats() });
  const children = useQuery({
    queryKey: ["children", search],
    queryFn: () => listChildren({ data: { search } }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-coral text-white shadow-pop">
              <PiggyBank className="size-5" />
            </div>
            <div>
              <div className="font-bold">Armoney</div>
              <div className="text-xs text-muted-foreground">Painel do administrador</div>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut} className="gap-2">
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Users className="size-5" />} label="Crianças cadastradas" value={stats.data?.childrenCount ?? 0} gradient="bg-gradient-coral" />
          <StatCard icon={<Wallet className="size-5" />} label="Saldo total do sistema" value={formatBRL(stats.data?.totalBalanceCents ?? 0)} gradient="bg-gradient-mint" />
          <StatCard icon={<ArrowDownCircle className="size-5" />} label="Depósitos" value={stats.data?.depositCount ?? 0} gradient="bg-gradient-sky" />
          <StatCard icon={<ArrowUpCircle className="size-5" />} label="Saques" value={stats.data?.withdrawCount ?? 0} gradient="bg-gradient-grape" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Crianças</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou usuário"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-9"
                  />
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-gradient-coral text-white shadow-pop hover:opacity-95">
                      <Plus className="size-4" /> Nova criança
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cadastrar criança</DialogTitle></DialogHeader>
                    <NewChildForm onDone={() => { setOpen(false); qc.invalidateQueries(); }} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border">
              {(children.data ?? []).map((c: any) => (
                <Link
                  key={c.id}
                  to="/admin/children/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between py-3 hover:bg-muted/40 rounded-lg px-2 -mx-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-full bg-gradient-sun text-2xl">{c.avatar_emoji}</div>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">@{c.username}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatBRL(Number(c.balance_cents))}</div>
                    <div className="text-xs text-muted-foreground">saldo</div>
                  </div>
                </Link>
              ))}
              {children.data && children.data.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma criança cadastrada ainda.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-card">
            <h2 className="text-xl font-bold">Últimas movimentações</h2>
            <div className="mt-4 space-y-3">
              {(stats.data?.recent ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`grid size-9 place-items-center rounded-full ${t.type === "deposit" ? "bg-mint/20 text-mint" : "bg-coral/20 text-coral"}`}
                    style={{ backgroundColor: t.type === "deposit" ? "color-mix(in oklab, var(--mint) 20%, transparent)" : "color-mix(in oklab, var(--coral) 20%, transparent)" }}>
                    {t.type === "deposit" ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold">{t.children?.name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.description || (t.type === "deposit" ? "Depósito" : "Saque")}</div>
                  </div>
                  <div className={`text-sm font-bold ${t.type === "deposit" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "deposit" ? "+" : "-"}{formatBRL(Number(t.amount_cents))}
                  </div>
                </div>
              ))}
              {stats.data && stats.data.recent.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">Sem movimentações ainda.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: React.ReactNode; gradient: string }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-card">
      <div className={`grid size-10 place-items-center rounded-xl text-white ${gradient}`}>{icon}</div>
      <div className="mt-4 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

const EMOJIS = ["🐷", "🦄", "🐼", "🐵", "🦊", "🐯", "🐸", "🐨", "🚀", "🌈"];
const COLORS = [
  { id: "sunset", label: "Pôr do sol" },
  { id: "coral", label: "Coral" },
  { id: "sun", label: "Sol" },
  { id: "mint", label: "Menta" },
  { id: "sky", label: "Céu" },
  { id: "grape", label: "Uva" },
] as const;

function NewChildForm({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createChild);
  const [state, setState] = useState({ name: "", username: "", pin: "", avatar_emoji: "🐷", card_color: "sunset" as const });
  const m = useMutation({
    mutationFn: () => create({ data: state as any }),
    onSuccess: () => { toast.success("Criança cadastrada!"); onDone(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
      <div><Label>Nome</Label><Input required value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} /></div>
      <div><Label>Usuário</Label><Input required value={state.username} onChange={(e) => setState({ ...state, username: e.target.value.toLowerCase() })} placeholder="ex.: anabia" /></div>
      <div><Label>PIN (4 dígitos)</Label><Input required inputMode="numeric" pattern="\d{4}" maxLength={4} value={state.pin} onChange={(e) => setState({ ...state, pin: e.target.value.replace(/\D/g, "") })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Avatar</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button type="button" key={e} onClick={() => setState({ ...state, avatar_emoji: e })}
                className={`grid size-9 place-items-center rounded-lg text-xl ${state.avatar_emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Cor do cartão</Label>
          <Select value={state.card_color} onValueChange={(v: any) => setState({ ...state, card_color: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{COLORS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={m.isPending} className="w-full bg-gradient-coral text-white shadow-pop">
        {m.isPending ? "Salvando..." : "Cadastrar"}
      </Button>
    </form>
  );
}
