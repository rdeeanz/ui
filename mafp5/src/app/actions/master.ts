"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { can } from "@/lib/rbac"

export type ActionResult = { ok: boolean; message: string }

async function guardAdmin(): Promise<ActionResult | null> {
  const user = await getSession()
  if (!user) return { ok: false, message: "Tidak terautentikasi." }
  if (!can.kelolaMasterData(user.role)) return { ok: false, message: "Hanya Administrator." }
  return null
}

async function logMaster(aksi: string, entitas: string, entitasId?: string, detail?: string) {
  const user = await getSession()
  await prisma.auditLog.create({
    data: { userId: user?.id ?? null, aksi, entitas, entitasId: entitasId ?? null, detail: detail ?? null },
  })
}

/* ---------------- Regional ---------------- */
const regionalSchema = z.object({
  id: z.string().optional(),
  kode: z.string().min(1, "Kode wajib").max(20),
  nama: z.string().min(1, "Nama wajib").max(100),
})

export async function simpanRegional(input: unknown): Promise<ActionResult> {
  const g = await guardAdmin()
  if (g) return g
  const p = regionalSchema.safeParse(input)
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Data tidak valid." }
  const { id, kode, nama } = p.data
  try {
    if (id) {
      await prisma.regional.update({ where: { id }, data: { kode, nama } })
      await logMaster("UPDATE", "Regional", id)
    } else {
      const r = await prisma.regional.create({ data: { kode, nama } })
      await logMaster("CREATE", "Regional", r.id)
    }
  } catch {
    return { ok: false, message: "Gagal menyimpan (kode mungkin duplikat)." }
  }
  revalidatePath("/master")
  return { ok: true, message: "Regional tersimpan." }
}

/* ---------------- Kategori ---------------- */
const kategoriSchema = z.object({
  id: z.string().optional(),
  nama: z.string().min(1, "Nama wajib").max(100),
  urutan: z.coerce.number().int().min(0).default(0),
})

export async function simpanKategori(input: unknown): Promise<ActionResult> {
  const g = await guardAdmin()
  if (g) return g
  const p = kategoriSchema.safeParse(input)
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Data tidak valid." }
  const { id, nama, urutan } = p.data
  try {
    if (id) {
      await prisma.kategoriFasilitas.update({ where: { id }, data: { nama, urutan } })
      await logMaster("UPDATE", "KategoriFasilitas", id)
    } else {
      const k = await prisma.kategoriFasilitas.create({ data: { nama, urutan } })
      await logMaster("CREATE", "KategoriFasilitas", k.id)
    }
  } catch {
    return { ok: false, message: "Gagal menyimpan (nama mungkin duplikat)." }
  }
  revalidatePath("/master")
  return { ok: true, message: "Kategori tersimpan." }
}

/* ---------------- Pelabuhan ---------------- */
const pelabuhanSchema = z.object({
  id: z.string().optional(),
  nama: z.string().min(1, "Nama wajib").max(120),
  regionalId: z.string().min(1, "Regional wajib"),
  operatorDefault: z.string().max(50).optional().nullable(),
})

export async function simpanPelabuhan(input: unknown): Promise<ActionResult> {
  const g = await guardAdmin()
  if (g) return g
  const p = pelabuhanSchema.safeParse(input)
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Data tidak valid." }
  const { id, nama, regionalId, operatorDefault } = p.data
  try {
    if (id) {
      await prisma.pelabuhan.update({ where: { id }, data: { nama, regionalId, operatorDefault: operatorDefault || null } })
      await logMaster("UPDATE", "Pelabuhan", id)
    } else {
      const pel = await prisma.pelabuhan.create({ data: { nama, regionalId, operatorDefault: operatorDefault || null } })
      await logMaster("CREATE", "Pelabuhan", pel.id)
    }
  } catch {
    return { ok: false, message: "Gagal menyimpan (nama mungkin duplikat dalam regional)." }
  }
  revalidatePath("/master")
  return { ok: true, message: "Pelabuhan tersimpan." }
}

/* ---------------- Delete ---------------- */
export async function hapusMaster(
  entitas: "regional" | "pelabuhan" | "kategori",
  id: string
): Promise<ActionResult> {
  const g = await guardAdmin()
  if (g) return g
  try {
    if (entitas === "regional") await prisma.regional.delete({ where: { id } })
    else if (entitas === "pelabuhan") await prisma.pelabuhan.delete({ where: { id } })
    else {
      const count = await prisma.fasilitas.count({ where: { kategoriId: id } })
      if (count > 0) return { ok: false, message: `Tidak bisa dihapus: ${count} fasilitas memakai kategori ini.` }
      await prisma.kategoriFasilitas.delete({ where: { id } })
    }
    await logMaster("DELETE", entitas, id)
  } catch {
    return { ok: false, message: "Gagal menghapus data." }
  }
  revalidatePath("/master")
  return { ok: true, message: "Data dihapus." }
}
