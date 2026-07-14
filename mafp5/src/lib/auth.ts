import "server-only"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { cache } from "react"

import { prisma } from "@/lib/prisma"
import type { Role } from "@/lib/roles"

export type { Role }

export type SessionUser = {
  id: string
  email: string
  nama: string
  role: Role
  regionalId: string | null
  pelabuhanId: string | null
}

const COOKIE_NAME = "map_session"
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
)
const MAX_AGE = 60 * 60 * 8 // 8 jam

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret)

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return (payload.user as SessionUser) ?? null
  } catch {
    return null
  }
})

/** Verifikasi kredensial dan buat sesi. Return user atau null. */
export async function authenticate(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const bcrypt = (await import("bcryptjs")).default
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !user.aktif) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role as Role,
    regionalId: user.regionalId,
    pelabuhanId: user.pelabuhanId,
  }
}
