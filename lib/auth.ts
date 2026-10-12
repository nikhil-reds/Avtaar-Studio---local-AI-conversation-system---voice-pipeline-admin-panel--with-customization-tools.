import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
const scrypt = promisify(nodeScrypt); const COOKIE = process.env.AUTH_COOKIE_NAME || "avtaar_session";
export async function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); const key = await scrypt(password, salt, 64) as Buffer; return `scrypt:${salt}:${key.toString("hex")}`; }
export async function verifyPassword(password: string, stored: string) { const [, salt, hex] = stored.split(":"); if (!salt || !hex) return false; const key = await scrypt(password, salt, 64) as Buffer; const expected = Buffer.from(hex, "hex"); return expected.length === key.length && timingSafeEqual(expected, key); }
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function createSession(userId: string, remember = true) { const token = randomBytes(32).toString("base64url"); const days = remember ? Number(process.env.AUTH_SESSION_TTL_DAYS || 7) : 1; const expiresAt = new Date(Date.now() + days * 86400000); await prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt } }); (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt }); }
export async function getCurrentUser() { const token = (await cookies()).get(COOKIE)?.value; if (!token) return null; const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } }); if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null; await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }); return session.user; }
export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error("UNAUTHENTICATED"); return user; }
export async function requireAdmin() { const user = await requireUser(); if (user.role !== "ADMIN") throw new Error("FORBIDDEN"); return user; }
export async function clearSession() { const token = (await cookies()).get(COOKIE)?.value; if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } }); (await cookies()).delete(COOKIE); }
