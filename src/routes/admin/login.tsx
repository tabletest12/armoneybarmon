import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin } from "@/lib/armoney.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyBank, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Acesso do administrador — Armoney" },
      { name: "description", content: "Faça login como administrador do Armoney." },
      { property: "og:title", content: "Admin • Armoney" },
      { property: "og:description", content: "Painel administrativo do banco infantil Armoney." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const claim = useServerFn(claimFirstAdmin);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        await claim();
        toast.success("Administrador cadastrado!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Attempt claim (no-op if already admin exists)
        try { await claim(); } catch { /* ignore */ }
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-6 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <PiggyBank className="size-4" /> Voltar
        </Link>
        <div className="mt-8 rounded-3xl bg-card p-8 shadow-card">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-sky text-white shadow-pop">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Painel do administrador</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Somente o Arthur (ou quem gerencia o Armoney) pode entrar aqui.
          </p>

          <form onSubmit={handle} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-coral text-white shadow-pop hover:opacity-95">
              {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <button
            className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Primeira vez? Criar conta de administrador" : "Já tenho conta — entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
