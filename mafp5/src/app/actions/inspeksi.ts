"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { can } from "@/lib/rbac"

const barisSchema = z
  .object({
    objekId: z.string().min(1),
    tersedia: z.number().min(0, "Tidak boleh negatif"),
    rusakRingan: z.number().min(0, "Tidak boleh negatif"),
    rusakSedang: z.number().min(0, "Tidak boleh negatif"),
    rusakBerat: z.number().min(0, "Tidak boleh negatif"),
    siapPakai: z.number().min(0, "Tidak boleh negatif"),
    keterangan: z.string().max(500).optional().nullable(),
  })
  .refine((d) => d.siapPakai <= d.tersedia, {
    message: "Siap pakai tidak boleh melebihi tersedia",
    path: ["siapPakai"],
  })
  .refine((d) => d.rusakRingan + d.rusakSedang + d.rusakBerat <= d.tersedia, {
    message: "Total rusak tidak boleh melebihi tersedia",
    path: ["rusakRingan"],
  })

const payloadSchema = z.object({
  inspeksiId: z.string().min(1),
  fasilitasId: z.string().min(1),
  baris: z.array(barisSchema).min(1),
})

export type SaveResult = { ok: boolean; message: string }

export async function saveCatatanFasilitas(input: unknown): Promise<SaveResult> {
  const user = await getSession()
  if (!user) return { ok: false, message: "Tidak terautentikasi." }
  if (!can.inputInspeksi(user.role)) return { ok: false, message: "Tidak memiliki akses." }

  const parsed = payloadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }
  const { inspeksiId, fasilitasId, baris } = parsed.data

  const inspeksi = await prisma.inspeksi.findUnique({ where: { id: inspeksiId } })
  if (!inspeksi) return { ok: false, message: "Inspeksi tidak ditemukan." }
  if (inspeksi.status === "DIVERIFIKASI" && user.role !== "ADMIN") {
    return { ok: false, message: "Inspeksi sudah diverifikasi dan terkunci." }
  }

  await prisma.$transaction(
    baris.map((b) =>
      prisma.catatanObjek.upsert({
        where: { inspeksiId_objekId: { inspeksiId, objekId: b.objekId } },
        create: {
          inspeksiId,
          objekId: b.objekId,
          fasilitasId,
          periodeId: inspeksi.periodeId,
          tersedia: b.tersedia,
          rusakRingan: b.rusakRingan,
          rusakSedang: b.rusakSedang,
          rusakBerat: b.rusakBerat,
          siapPakai: b.siapPakai,
          keterangan: b.keterangan ?? null,
        },
        update: {
          tersedia: b.tersedia,
          rusakRingan: b.rusakRingan,
          rusakSedang: b.rusakSedang,
          rusakBerat: b.rusakBerat,
          siapPakai: b.siapPakai,
          keterangan: b.keterangan ?? null,
        },
      })
    )
  )

  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "UPDATE", entitas: "CatatanObjek", entitasId: fasilitasId, detail: `${baris.length} objek` },
  })

  revalidatePath(`/inspeksi/${inspeksiId}`)
  return { ok: true, message: "Data tersimpan." }
}

export async function ubahStatusInspeksi(
  inspeksiId: string,
  aksi: "ajukan" | "verifikasi" | "kembalikan"
): Promise<SaveResult> {
  const user = await getSession()
  if (!user) return { ok: false, message: "Tidak terautentikasi." }

  const inspeksi = await prisma.inspeksi.findUnique({ where: { id: inspeksiId } })
  if (!inspeksi) return { ok: false, message: "Inspeksi tidak ditemukan." }

  if (aksi === "ajukan") {
    if (!can.inputInspeksi(user.role)) return { ok: false, message: "Tidak memiliki akses." }
    await prisma.inspeksi.update({ where: { id: inspeksiId }, data: { status: "DIAJUKAN" } })
  } else if (aksi === "verifikasi") {
    if (!can.verifikasi(user.role)) return { ok: false, message: "Hanya PIC/Admin dapat verifikasi." }
    await prisma.inspeksi.update({
      where: { id: inspeksiId },
      data: { status: "DIVERIFIKASI", verifikatorId: user.id, diverifikasiAt: new Date() },
    })
  } else {
    if (!can.verifikasi(user.role)) return { ok: false, message: "Tidak memiliki akses." }
    await prisma.inspeksi.update({
      where: { id: inspeksiId },
      data: { status: "DRAFT", verifikatorId: null, diverifikasiAt: null },
    })
  }

  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "VERIFY", entitas: "Inspeksi", entitasId: inspeksiId, detail: aksi },
  })
  revalidatePath(`/inspeksi/${inspeksiId}`)
  revalidatePath(`/inspeksi`)
  return { ok: true, message: "Status diperbarui." }
}
