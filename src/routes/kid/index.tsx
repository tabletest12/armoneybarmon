import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import { kidMe, kidLogout, createGoal, deleteGoal } from "@/lib/armoney.functions";
import { clearKidToken, formatBRL, getKidToken } from "@/lib/kid-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, LogOut, Plus, QrCode as QrIcon, Trash2 } from "lucide-react";

export const Route = createFileRoute("/kid/")({
  head: () => ({
    meta: [
      { title: "Meu banco — Armoney" },
      { name: "description", content: "Sua conta, cartão, QR Code, histórico e metas no Armoney." },
      { property: "og:title", content: "Meu banco Armoney" },
      { property: "og:description", content: "Meu saldo, meu cartão, minhas metas." },
    ],
  }),
  component: KidHome,
});

function KidHome() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = getKidToken();
    if (!t) { navigate({ to: "/kid/login" }); return; }
    setToken(t);
  }, []);
  if (!token) return null;
  return <Board token={token} />;
}

function Board({ token }: { token: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useServerFn(kidMe);
  const logout = useServerFn(kidLogout);
  const mkGoal = useServerFn(createGoal);
  const rmGoal = useServerFn(deleteGoal);

  const q = useQuery({
    queryKey: ["kidMe"],
    queryFn: () => me({ data: { token } }),
    retry: false,
  });

  useEffect(() => {
    if (q.error) { clearKidToken(); navigate({ to: "/kid/login" }); }
  }, [q.error]);

  async function doLogout() {
    try { await logout({ data: { token } }); } catch {}
    clearKidToken();
    navigate({ to: "/" });
  }

  if (q.isLoading || !q.data) return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  const { child, transactions, goals } = q.data;
  const gradClass = `bg-gradient-${child.card_color}`;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-full bg-gradient-sun text-2xl">{child.avatar_emoji}</div>
          <div>
            <div className="text-xs text-muted-foreground">Oi,</div>
            <div className="font-bold leading-none">{child.name}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={doLogout}><LogOut className="size-5" /></Button>
      </header>

      <main className="mx-auto max-w-md px-5">
        <div className={`mt-6 rounded-3xl p-6 text-white shadow-pop ${gradClass}`}>
          <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-80">
            <span>Armoney</span><span>VISA*</span>
          </div>
          <div className="mt-10 text-4xl font-bold">{formatBRL(Number(child.balance_cents))}</div>
          <div className="mt-1 text-xs opacity-80">Saldo disponível</div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase opacity-70">Titular</div>
              <div className="text-lg font-semibold">{child.name}</div>
              <div className="text-xs opacity-70">@{child.username}</div>
            </div>
            <div className="text-5xl">{child.avatar_emoji}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-14 gap-2 rounded-2xl bg-card text-foreground shadow-card hover:bg-card" variant="secondary">
                <QrIcon className="size-4" /> Meu QR Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Meu QR Code</DialogTitle></DialogHeader>
              <QrDisplay token={child.qr_token} name={child.name} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-14 gap-2 rounded-2xl bg-gradient-mint text-white shadow-pop"><Plus className="size-4" /> Nova meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar meta</DialogTitle></DialogHeader>
              <NewGoalForm onSubmit={async (data) => {
                try {
                  await mkGoal({ data: { token, ...data } });
                  toast.success("Meta criada!");
                  qc.invalidateQueries({ queryKey: ["kidMe"] });
                } catch (e: any) { toast.error(e.message); }
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="hist" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hist">Movimentações</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>
          <TabsContent value="hist" className="mt-4">
            <div className="rounded-3xl bg-card p-4 shadow-card divide-y divide-border">
              {transactions.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação ainda.</div>}
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full"
                      style={{ backgroundColor: t.type === "deposit" ? "color-mix(in oklab, var(--mint) 25%, transparent)" : "color-mix(in oklab, var(--coral) 25%, transparent)" }}>
                      {t.type === "deposit" ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.description || (t.type === "deposit" ? "Depósito" : "Saque")}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${t.type === "deposit" ? "text-green-600" : "text-red-500"}`}>
                    {t.type === "deposit" ? "+" : "-"}{formatBRL(Number(t.amount_cents))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="goals" className="mt-4 space-y-3">
            {goals.length === 0 && (
              <div className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
                Sem metas ainda. Toque em "Nova meta" para começar!
              </div>
            )}
            {goals.map((g: any) => {
              const pct = Math.min(100, Math.round((Number(child.balance_cents) / Number(g.target_cents)) * 100));
              return (
                <div key={g.id} className="rounded-3xl bg-card p-4 shadow-card">
                  {g.image_url && <img src={g.image_url} alt="" className="mb-3 aspect-video w-full rounded-2xl object-cover" />}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-xs text-muted-foreground">Meta: {formatBRL(Number(g.target_cents))}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (!confirm("Excluir meta?")) return;
                      try { await rmGoal({ data: { token, goalId: g.id } }); qc.invalidateQueries({ queryKey: ["kidMe"] }); }
                      catch (e: any) { toast.error(e.message); }
                    }}><Trash2 className="size-4" /></Button>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-mint" style={{ width: pct + "%" }} /></div>
                  <div className="mt-1 text-right text-xs font-semibold text-muted-foreground">{pct}% • {formatBRL(Math.min(Number(child.balance_cents), Number(g.target_cents)))}</div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function QrDisplay({ token, name }: { token: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, `armoney://kid/${token}`, {
      width: 260, margin: 1, color: { dark: "#1f1145", light: "#ffffff" },
    });
  }, [token]);
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="rounded-3xl bg-white p-4 shadow-card"><canvas ref={canvasRef} /></div>
      <div className="text-center">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">ID único do Armoney</div>
      </div>
    </div>
  );
}

function NewGoalForm({ onSubmit }: { onSubmit: (d: { name: string; targetCents: number; imageUrl?: string | null }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const cents = Math.round(Number(target.replace(",", ".")) * 100);
      if (!name || !cents) return toast.error("Preencha nome e valor");
      setLoading(true);
      try { await onSubmit({ name, targetCents: cents, imageUrl: image || null }); }
      finally { setLoading(false); }
    }} className="space-y-4">
      <div><Label>Nome da meta</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bicicleta nova" /></div>
      <div><Label>Valor desejado (R$)</Label><Input required inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="300" /></div>
      <div><Label>Imagem (URL, opcional)</Label><Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." /></div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-mint text-white shadow-pop">{loading ? "Salvando..." : "Criar meta"}</Button>
    </form>
  );
}
