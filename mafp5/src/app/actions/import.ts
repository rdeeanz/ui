"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { parseWorkbook } from "@/lib/import-xlsx"

export type ImportResult = {
  ok: boolean
  message: string
  ringkasan?: { pelabuhan: number; fasilitas: number; objek: number; periode: string }
}

const BULAN_INDEX: Record<string, number> = {
  JANUARI: 1, FEBRUARI: 2, MARET: 3, APRIL: 4, MEI: 5, JUNI: 6,
  JULI: 7, AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12,
}
function urutan(bulan: string, tahun: number): number {
  return tahun * 100 + (BULAN_INDEX[bulan.toUpperCase()] ?? 1)
}

export async function importExcel(formData: FormData): Promise<ImportResult> {
  const user = await getSession()
  if (!user || !can.kelolaMasterData(user.role)) return { ok: false, message: "Hanya Administrator." }

  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, message: "File tidak ditemukan." }
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { ok: false, message: "Format harus .xlsx" }

  let parsed
  try {
    parsed = await parseWorkbook(await file.arrayBuffer())
  } catch {
    return { ok: false, message: "Gagal membaca file Excel." }
  }
  if (parsed.length === 0) return { ok: false, message: "Tidak ada data valid pada file." }

  let cFas = 0
  let cObj = 0
  let periodeLabel = ""

  for (const pel of parsed) {
    // Regional (by nama)
    let regional = await prisma.regional.findFirst({ where: { nama: pel.regionalNama } })
    if (!regional) {
      const kode = "REG" + (pel.regionalNama.replace(/[^0-9]/g, "") || Date.now().toString().slice(-3))
      regional = await prisma.regional.create({ data: { kode, nama: pel.regionalNama } })
    }

    const pelabuhan = await prisma.pelabuhan.upsert({
      where: { regionalId_nama: { regionalId: regional.id, nama: pel.nama } },
      create: { nama: pel.nama, regionalId: regional.id, operatorDefault: pel.operatorDefault },
      update: { operatorDefault: pel.operatorDefault ?? undefined },
    })

    const periode = await prisma.periode.upsert({
      where: { bulan_tahun: { bulan: pel.bulan, tahun: pel.tahun } },
      create: { bulan: pel.bulan, tahun: pel.tahun, urutan: urutan(pel.bulan, pel.tahun) },
      update: {},
    })
    periodeLabel = `${pel.bulan} ${pel.tahun}`

    const inspeksi = await prisma.inspeksi.upsert({
      where: { pelabuhanId_periodeId: { pelabuhanId: pelabuhan.id, periodeId: periode.id } },
      create: { pelabuhanId: pelabuhan.id, periodeId: periode.id, status: "DIAJUKAN", pembuatId: user.id },
      update: {},
    })

    for (const kat of pel.kategori) {
      const kategori = await prisma.kategoriFasilitas.upsert({
        where: { nama: kat.nama },
        create: { nama: kat.nama, urutan: kat.urutan },
        update: {},
      })

      for (const fas of kat.fasilitas) {
        let fasilitas = await prisma.fasilitas.findFirst({
          where: { pelabuhanId: pelabuhan.id, kategoriId: kategori.id, nama: fas.nama },
        })
        if (!fasilitas) {
          fasilitas = await prisma.fasilitas.create({
            data: {
              nama: fas.nama, konstruksi: fas.konstruksi, operator: fas.operator ?? pel.operatorDefault,
              pelabuhanId: pelabuhan.id, kategoriId: kategori.id,
            },
          })
          cFas++
        }

        for (const obj of fas.objek) {
          let objek = await prisma.objekFasilitas.findFirst({
            where: { fasilitasId: fasilitas.id, nama: obj.nama },
          })
          if (!objek) {
            objek = await prisma.objekFasilitas.create({
              data: {
                nama: obj.nama, satuan: obj.satuan, panjang: obj.panjang, lebar: obj.lebar,
                luas: obj.luas, jumlah: obj.jumlah, fasilitasId: fasilitas.id,
              },
            })
          }
          await prisma.catatanObjek.upsert({
            where: { inspeksiId_objekId: { inspeksiId: inspeksi.id, objekId: objek.id } },
            create: {
              inspeksiId: inspeksi.id, objekId: objek.id, fasilitasId: fasilitas.id, periodeId: periode.id,
              tersedia: obj.tersedia, rusakRingan: obj.rusakRingan, rusakSedang: obj.rusakSedang,
              rusakBerat: obj.rusakBerat, siapPakai: obj.siapPakai, keterangan: obj.keterangan,
            },
            update: {
              tersedia: obj.tersedia, rusakRingan: obj.rusakRingan, rusakSedang: obj.rusakSedang,
              rusakBerat: obj.rusakBerat, siapPakai: obj.siapPakai, keterangan: obj.keterangan,
            },
          })
          cObj++
        }
      }
    }
  }

  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "IMPORT", entitas: "Excel", detail: `${parsed.length} pelabuhan, ${cObj} objek` },
  })

  revalidatePath("/")
  revalidatePath("/master")
  return {
    ok: true,
    message: "Import berhasil.",
    ringkasan: { pelabuhan: parsed.length, fasilitas: cFas, objek: cObj, periode: periodeLabel },
  }
}
