// Server functions for Armoney. Split-safe: only imports + createServerFn declarations at module scope.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Admin bootstrap / auth check ----------
export const isAdminCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isAdmin: !!data };
  });

// Promote current authenticated user to admin ONLY if no admin exists yet.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("admins").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      const { data: existing } = await supabaseAdmin
        .from("admins").select("user_id").eq("user_id", context.userId).maybeSingle();
      if (existing) return { ok: true, alreadyAdmin: true };
      throw new Error("Já existe um administrador cadastrado.");
    }
    const { error } = await supabaseAdmin.from("admins").insert({ user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyAdmin: false };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

// ---------- Admin: list & stats ----------
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: childrenCount }, balances, deposits, withdraws, recent] = await Promise.all([
      supabaseAdmin.from("children").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("children").select("balance_cents"),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }).eq("type", "deposit"),
      supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }).eq("type", "withdraw"),
      supabaseAdmin
        .from("transactions")
        .select("id, type, amount_cents, description, created_at, child_id, children(name, avatar_emoji)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const totalBalance = (balances.data ?? []).reduce((s, r: any) => s + Number(r.balance_cents), 0);
    return {
      childrenCount: childrenCount ?? 0,
      totalBalanceCents: totalBalance,
      depositCount: deposits.count ?? 0,
      withdrawCount: withdraws.count ?? 0,
      recent: recent.data ?? [],
    };
  });

export const listChildren = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("children").select("*").order("created_at", { ascending: false });
    if (data.search && data.search.trim()) {
      const term = `%${data.search.trim()}%`;
      q = q.or(`name.ilike.${term},username.ilike.${term}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Admin: create / update / delete child ----------
const createChildSchema = z.object({
  name: z.string().trim().min(1).max(80),
  username: z.string().trim().toLowerCase().min(3).max(30).regex(/^[a-z0-9_.-]+$/, "Use letras, números, ponto, hífen ou underscore"),
  pin: z.string().regex(/^\d{4}$/, "PIN deve ter 4 dígitos"),
  avatar_emoji: z.string().min(1).max(4).default("🐷"),
  card_color: z.enum(["coral", "sun", "mint", "sky", "grape", "sunset"]).default("sunset"),
});

export const createChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createChildSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPin } = await import("./armoney.server");
    const pin_hash = await hashPin(data.pin);
    const { data: row, error } = await supabaseAdmin.from("children").insert({
      name: data.name, username: data.username, pin_hash,
      avatar_emoji: data.avatar_emoji, card_color: data.card_color,
    }).select().single();
    if (error) {
      if (error.code === "23505") throw new Error("Este nome de usuário já existe.");
      throw new Error(error.message);
    }
    return row;
  });

export const updateChildPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ childId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashPin } = await import("./armoney.server");
    const pin_hash = await hashPin(data.pin);
    const { error } = await supabaseAdmin.from("children").update({ pin_hash }).eq("id", data.childId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ childId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("children").delete().eq("id", data.childId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: transactions ----------
const txSchema = z.object({
  childId: z.string().uuid(),
  amountCents: z.number().int().positive().max(100_000_00),
  description: z.string().max(200).optional().default(""),
  type: z.enum(["deposit", "withdraw"]),
});

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => txSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: child, error: cerr } = await supabaseAdmin
      .from("children").select("id, balance_cents").eq("id", data.childId).single();
    if (cerr || !child) throw new Error("Criança não encontrada.");
    const delta = data.type === "deposit" ? data.amountCents : -data.amountCents;
    const newBalance = Number(child.balance_cents) + delta;
    if (newBalance < 0) throw new Error("Saldo insuficiente para este saque.");
    const { error: uerr } = await supabaseAdmin
      .from("children").update({ balance_cents: newBalance }).eq("id", data.childId);
    if (uerr) throw new Error(uerr.message);
    const { error: terr } = await supabaseAdmin.from("transactions").insert({
      child_id: data.childId, type: data.type,
      amount_cents: data.amountCents, description: data.description || null,
      balance_after_cents: newBalance,
    });
    if (terr) throw new Error(terr.message);
    return { ok: true, balanceCents: newBalance };
  });

export const getChildDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ childId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [child, transactions, goals] = await Promise.all([
      supabaseAdmin.from("children").select("*").eq("id", data.childId).single(),
      supabaseAdmin.from("transactions").select("*").eq("child_id", data.childId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("goals").select("*").eq("child_id", data.childId).order("created_at", { ascending: false }),
    ]);
    if (child.error) throw new Error(child.error.message);
    return { child: child.data, transactions: transactions.data ?? [], goals: goals.data ?? [] };
  });

// ---------- Kid: login / logout / me ----------
export const kidLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    username: z.string().trim().toLowerCase().min(1),
    pin: z.string().regex(/^\d{4}$/),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPin, generateToken } = await import("./armoney.server");
    const { data: child } = await supabaseAdmin
      .from("children").select("id, pin_hash").eq("username", data.username).maybeSingle();
    if (!child) throw new Error("Usuário ou PIN incorretos.");
    const ok = await verifyPin(data.pin, child.pin_hash);
    if (!ok) throw new Error("Usuário ou PIN incorretos.");
    const token = generateToken();
    const { error } = await supabaseAdmin.from("kid_sessions").insert({ token, child_id: child.id });
    if (error) throw new Error(error.message);
    return { token, childId: child.id };
  });

async function getKidByToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: session } = await supabaseAdmin
    .from("kid_sessions").select("child_id, expires_at").eq("token", token).maybeSingle();
  if (!session) throw new Error("Sessão inválida.");
  if (new Date(session.expires_at).getTime() < Date.now()) throw new Error("Sessão expirada.");
  return session.child_id as string;
}

export const kidLogout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("kid_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

export const kidMe = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const childId = await getKidByToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [child, tx, goals] = await Promise.all([
      supabaseAdmin.from("children").select("id, name, username, balance_cents, qr_token, card_color, avatar_emoji, created_at").eq("id", childId).single(),
      supabaseAdmin.from("transactions").select("*").eq("child_id", childId).order("created_at", { ascending: false }).limit(30),
      supabaseAdmin.from("goals").select("*").eq("child_id", childId).order("created_at", { ascending: false }),
    ]);
    if (child.error) throw new Error(child.error.message);
    return { child: child.data, transactions: tx.data ?? [], goals: goals.data ?? [] };
  });

// ---------- Kid: goals ----------
const goalSchema = z.object({
  token: z.string(),
  name: z.string().trim().min(1).max(80),
  targetCents: z.number().int().positive().max(1_000_000_00),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

export const createGoal = createServerFn({ method: "POST" })
  .inputValidator((d) => goalSchema.parse(d))
  .handler(async ({ data }) => {
    const childId = await getKidByToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("goals").insert({
      child_id: childId, name: data.name, target_cents: data.targetCents, image_url: data.imageUrl || null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), goalId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const childId = await getKidByToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("goals").delete().eq("id", data.goalId).eq("child_id", childId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
