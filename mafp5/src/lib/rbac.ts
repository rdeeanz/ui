import { redirect } from "next/navigation"

import { getSession, type Role, type SessionUser } from "@/lib/auth"
import { ROLE_LABEL, can } from "@/lib/roles"

export { ROLE_LABEL, can }

/** Ambil user sesi atau redirect ke /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect("/login")
  return user
}

/** Wajib salah satu role, jika tidak redirect ke dashboard. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect("/")
  return user
}

/** Scope untuk modul analytics (regionalId / pelabuhanId). */
export function analyticsScope(user: SessionUser): {
  regionalId?: string
  pelabuhanId?: string
} {
  if (user.role === "ADMIN" || user.role === "MANAJEMEN") return {}
  if (user.role === "PIC_REGIONAL" && user.regionalId) return { regionalId: user.regionalId }
  if (user.role === "PETUGAS" && user.pelabuhanId) return { pelabuhanId: user.pelabuhanId }
  return {}
}

/** Filter Prisma untuk membatasi data sesuai scope role. */
export function scopeFilterPelabuhan(user: SessionUser) {
  if (user.role === "ADMIN" || user.role === "MANAJEMEN") return {}
  if (user.role === "PIC_REGIONAL" && user.regionalId)
    return { regionalId: user.regionalId }
  if (user.role === "PETUGAS" && user.pelabuhanId)
    return { id: user.pelabuhanId }
  return {}
}
