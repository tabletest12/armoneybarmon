// Server-only helpers for Armoney. Never import from client code.
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}
export function verifyPin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash);
}
export function generateToken() {
  return randomBytes(24).toString("hex");
}
