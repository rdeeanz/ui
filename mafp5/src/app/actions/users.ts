"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { can } from "@/lib/rbac"

export type ActionResult = { ok: boolean; message: string }

const userSchema = z.object({
  id: z.string().optional(),
  nama: z.string().min(1, "Nama wajib").max(100),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["ADMIN", "PETUGAS", "PIC_REGIONAL", "MANAJEMEN"]),
  password: z.string().optional(),
  regionalId: z.string().optional().nullable(),
  pelabuhanId: z.string().optional().nullable(),
})

export async function simpanUser(input: unknown): Promise<ActionResult> {
  const admin = await getSession()
  if (!admin || !can.kelolaUser(admin.role)) return { ok: false, message: "Hanya Administrator." }

  const parsed = userSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  const { id, nama, email, role, password, regionalId, pelabuhanId } = parsed.data

  const bcrypt = (await import("bcryptjs")).default
  try {
    if (id) {
      const data: Record<string, unknown> = {
        nama,
        email: email.toLowerCase(),
        role,
        regionalId: regionalId || null,
        pelabuhanId: pelabuhanId || null,
      }
      if (password && password.length >= 6) data.passwordHash = await bcrypt.hash(password, 10)
      await prisma.user.update({ where: { id }, data })
    } else {
      if (!password || password.length < 6)
        return { ok: false, message: "Kata sandi minimal 6 karakter untuk user baru." }
      await prisma.user.create({
        data: {
          nama,
          email: email.toLowerCase(),
          role,
          passwordHash: await bcrypt.hash(password, 10),
          regionalId: regionalId || null,
          pelabuhanId: pelabuhanId || null,
        },
      })
    }
    await prisma.auditLog.create({
      data: { userId: admin.id, aksi: id ? "UPDATE" : "CREATE", entitas: "User", entitasId: id ?? null },
    })
  } catch {
    return { ok: false, message: "Gagal menyimpan (email mungkin sudah terdaftar)." }
  }
  revalidatePath("/users")
  return { ok: true, message: "Pengguna tersimpan." }
}

export async function toggleUserAktif(id: string, aktif: boolean): Promise<ActionResult> {
  const admin = await getSession()
  if (!admin || !can.kelolaUser(admin.role)) return { ok: false, message: "Hanya Administrator." }
  if (admin.id === id) return { ok: false, message: "Tidak dapat menonaktifkan akun sendiri." }
  await prisma.user.update({ where: { id }, data: { aktif } })
  revalidatePath("/users")
  return { ok: true, message: aktif ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan." }
}
