// Client-side kid session helper (localStorage-backed).
const KEY = "armoney.kid.token";

export function getKidToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}
export function setKidToken(token: string) {
  window.localStorage.setItem(KEY, token);
}
export function clearKidToken() {
  window.localStorage.removeItem(KEY);
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
