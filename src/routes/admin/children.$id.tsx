import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getChildDetail, createTransaction, deleteChild, updateChildPin, isAdminCheck,
} from "@/lib/armoney.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/kid-session";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, KeyRound, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/children/$id")({
  head: () => ({
    meta: [
      { title: "Conta — Armoney" },
      { name: "description", content: "Conta da criança no Armoney." },
      { property: "og:title", content: "Conta • Armoney" },
      { property: "og:description", content: "Detalhes, depósitos e saques." },
    ],
  }),
  component: ChildPage,
});

function ChildPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const check = useServerFn(isAdminCheck);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/admin/login" }); return; }
      try { const r = await check(); if (!r.isAdmin) { navigate({ to: "/admin/login" }); return; } setReady(true); }
      catch { navigate({ to: "/admin/login" }); }
    })();
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  return <ChildDetail id={id} />;
}

function ChildDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["child", id], queryFn: () => getChildDetail({ data: { childId: id } }) });
  const tx = useServerFn(createTransaction);
  const del = useServerFn(deleteChild);
  const updPin = useServerFn(updateChildPin);

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [newPin, setNewPin] = useState("");

  const mDep = useMutation({
    mutationFn: () => tx({ data: { childId: id, amountCents: Math.round(Number(amount.replace(",", ".")) * 100), description: desc, type: "deposit" } }),
    onSuccess: () => { toast.success("Depósito realizado!"); setAmount(""); setDesc(""); qc.invalidateQueries({ queryKey: ["child", id] }); qc.invalidateQueries({ queryKey: ["stats"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  const mWd = useMutation({
    mutationFn: () => tx({ data: { childId: id, amountCents: Math.round(Number(amount.replace(",", ".")) * 100), description: desc, type: "withdraw" } }),
    onSuccess: () => { toast.success("Saque realizado!"); setAmount(""); setDesc(""); qc.invalidateQueries({ queryKey: ["child", id] }); qc.invalidateQueries({ queryKey: ["stats"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (detail.isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  const child = detail.data?.child;
  if (!child) return <div>Criança não encontrada</div>;
  const gradClass = `bg-gradient-${child.card_color}`;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className={`rounded-3xl p-6 text-white shadow-pop ${gradClass}`}>
              <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-80">
                <span>Armoney</span><span>VISA*</span>
              </div>
              <div className="mt-8 text-3xl font-bold">{formatBRL(Number(child.balance_cents))}</div>
              <div className="mt-1 text-xs opacity-80">Saldo disponível</div>
              <div className="mt-8 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase opacity-70">Titular</div>
                  <div className="text-lg font-semibold">{child.name}</div>
                  <div className="text-xs opacity-70">@{child.username}</div>
                </div>
                <div className="text-4xl">{child.avatar_emoji}</div>
              </div>
            </div>

            <div className="rounded-3xl bg-card p-5 shadow-card space-y-3">
              <div>
                <Label>Redefinir PIN</Label>
                <div className="mt-1 flex gap-2">
                  <Input inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="0000" />
                  <Button
                    onClick={async () => {
                      if (!/^\d{4}$/.test(newPin)) return toast.error("PIN inválido");
                      try { await updPin({ data: { childId: id, pin: newPin } }); toast.success("PIN atualizado"); setNewPin(""); }
                      catch (e: any) { toast.error(e.message); }
                    }}
                    variant="secondary" className="gap-1"
                  ><KeyRound className="size-4" /> Salvar</Button>
                </div>
              </div>
              <Button
                variant="destructive" className="w-full gap-2"
                onClick={async () => {
                  if (!confirm(`Excluir ${child.name}? Todos os dados serão perdidos.`)) return;
                  try { await del({ data: { childId: id } }); toast.success("Removida"); navigate({ to: "/admin" }); }
                  catch (e: any) { toast.error(e.message); }
                }}
              ><Trash2 className="size-4" /> Excluir criança</Button>
            </div>
          </aside>

          <section className="rounded-3xl bg-card p-6 shadow-card">
            <Tabs defaultValue="tx">
              <TabsList>
                <TabsTrigger value="tx">Movimentar</TabsTrigger>
                <TabsTrigger value="hist">Histórico</TabsTrigger>
                <TabsTrigger value="goals">Metas</TabsTrigger>
              </TabsList>

              <TabsContent value="tx" className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="mt-1 text-2xl font-bold" />
                  </div>
                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Mesada de novembro" className="mt-1" rows={1} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button disabled={!amount || mDep.isPending} onClick={() => mDep.mutate()} className="gap-2 bg-gradient-mint text-white shadow-pop">
                    <ArrowDownCircle className="size-4" /> Depositar
                  </Button>
                  <Button disabled={!amount || mWd.isPending} onClick={() => mWd.mutate()} className="gap-2 bg-gradient-coral text-white shadow-pop">
                    <ArrowUpCircle className="size-4" /> Sacar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="hist" className="mt-6">
                <TxList tx={detail.data?.transactions ?? []} />
              </TabsContent>

              <TabsContent value="goals" className="mt-6">
                <GoalsList goals={detail.data?.goals ?? []} balanceCents={Number(child.balance_cents)} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}

function TxList({ tx }: { tx: any[] }) {
  if (!tx.length) return <div className="py-8 text-center text-sm text-muted-foreground">Sem movimentações.</div>;
  return (
    <div className="divide-y divide-border">
      {tx.map((t) => (
        <div key={t.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full"
              style={{ backgroundColor: t.type === "deposit" ? "color-mix(in oklab, var(--mint) 25%, transparent)" : "color-mix(in oklab, var(--coral) 25%, transparent)" }}>
              {t.type === "deposit" ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
            </div>
            <div>
              <div className="text-sm font-semibold">{t.description || (t.type === "deposit" ? "Depósito" : "Saque")}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</div>
            </div>
          </div>
          <div className={`font-bold ${t.type === "deposit" ? "text-green-600" : "text-red-500"}`}>
            {t.type === "deposit" ? "+" : "-"}{formatBRL(Number(t.amount_cents))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsList({ goals, balanceCents }: { goals: any[]; balanceCents: number }) {
  if (!goals.length) return <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma meta criada. A criança pode criar direto no app dela.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {goals.map((g) => {
        const pct = Math.min(100, Math.round((balanceCents / Number(g.target_cents)) * 100));
        return (
          <div key={g.id} className="rounded-2xl border border-border p-4">
            {g.image_url && <img src={g.image_url} alt="" className="mb-3 aspect-video w-full rounded-xl object-cover" />}
            <div className="font-semibold">{g.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">Meta: {formatBRL(Number(g.target_cents))}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-mint" style={{ width: pct + "%" }} /></div>
            <div className="mt-1 text-right text-xs text-muted-foreground">{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}
