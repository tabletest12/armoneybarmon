import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { kidLogin } from "@/lib/armoney.functions";
import { setKidToken } from "@/lib/kid-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PiggyBank } from "lucide-react";

export const Route = createFileRoute("/kid/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Armoney" },
      { name: "description", content: "Entre no seu banco Armoney com usuário e PIN." },
      { property: "og:title", content: "Armoney Kids" },
      { property: "og:description", content: "Seu banco, seu jeito." },
    ],
  }),
  component: KidLogin,
});

function KidLogin() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useServerFn(kidLogin);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) return toast.error("Digite os 4 dígitos do PIN");
    setLoading(true);
    try {
      const { token } = await login({ data: { username, pin } });
      setKidToken(token);
      navigate({ to: "/kid" });
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao entrar");
      setPin("");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-6 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <PiggyBank className="size-4" /> Voltar
        </Link>
        <div className="mt-8 rounded-3xl bg-card p-8 shadow-card">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-coral text-white shadow-pop text-3xl">🐷</div>
          <h1 className="mt-5 text-3xl font-bold">Oi! Bora entrar?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Digite seu usuário e seu PIN secreto de 4 números.</p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="u">Usuário</Label>
              <Input id="u" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="anabia" className="mt-1" />
            </div>
            <div>
              <Label>PIN</Label>
              <InputOTP maxLength={4} value={pin} onChange={setPin} containerClassName="mt-1 justify-center">
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="size-14 text-2xl" />
                  <InputOTPSlot index={1} className="size-14 text-2xl" />
                  <InputOTPSlot index={2} className="size-14 text-2xl" />
                  <InputOTPSlot index={3} className="size-14 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-coral text-white shadow-pop py-6 text-base">
              {loading ? "Entrando..." : "Entrar no meu banco"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
