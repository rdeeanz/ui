/* eslint-disable no-console */
import { PrismaClient, Role } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

type SeedObjek = {
  nama: string
  satuan: string
  panjang: number | null
  lebar: number | null
  luas: number | null
  jumlah: number | null
  tersedia: number | null
  rusakRingan: number | null
  rusakSedang: number | null
  rusakBerat: number | null
  siapPakai: number | null
  keterangan: string | null
}
type SeedFasilitas = { nama: string; konstruksi: string | null; operator: string | null; objek: SeedObjek[] }
type SeedKategori = { nama: string; urutan: number; fasilitas: SeedFasilitas[] }
type SeedPelabuhan = { nama: string; operatorDefault: string | null; kategori: SeedKategori[] }
type SeedData = {
  periode: { bulan: string; tahun: number }
  regionals: { nama: string; pelabuhan: SeedPelabuhan[] }[]
}

const BULAN_INDEX: Record<string, number> = {
  JANUARI: 1, FEBRUARI: 2, MARET: 3, APRIL: 4, MEI: 5, JUNI: 6,
  JULI: 7, AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12,
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function periodeUrutan(bulan: string, tahun: number): number {
  const idx = BULAN_INDEX[bulan.toUpperCase()] ?? 1
  return tahun * 100 + idx
}

async function main() {
  const data: SeedData = JSON.parse(
    readFileSync(path.join(__dirname, "seed-data.json"), "utf-8")
  )

  console.log("Membersihkan data lama...")
  await prisma.auditLog.deleteMany()
  await prisma.catatanObjek.deleteMany()
  await prisma.inspeksi.deleteMany()
  await prisma.objekFasilitas.deleteMany()
  await prisma.fasilitas.deleteMany()
  await prisma.pelabuhan.deleteMany()
  await prisma.kategoriFasilitas.deleteMany()
  await prisma.periode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.regional.deleteMany()

  // ---- Kategori master (global, unik lintas pelabuhan) ----
  const kategoriUrutan = new Map<string, number>()
  for (const reg of data.regionals)
    for (const pel of reg.pelabuhan)
      for (const kat of pel.kategori) {
        const cur = kategoriUrutan.get(kat.nama)
        if (cur == null || kat.urutan < cur) kategoriUrutan.set(kat.nama, kat.urutan)
      }
  const kategoriId = new Map<string, string>()
  const kategoriRows = [...kategoriUrutan.entries()].map(([nama, urutan]) => {
    const id = randomUUID()
    kategoriId.set(nama, id)
    return { id, nama, urutan }
  })
  await prisma.kategoriFasilitas.createMany({ data: kategoriRows })
  console.log(`Kategori: ${kategoriRows.length}`)

  // ---- Periode: 5 periode historis + periode saat ini ----
  const cur = data.periode
  const periodeDefs = [
    { bulan: "DESEMBER", tahun: cur.tahun - 1 },
    { bulan: "JANUARI", tahun: cur.tahun },
    { bulan: "FEBRUARI", tahun: cur.tahun },
    { bulan: "MARET", tahun: cur.tahun },
    { bulan: "APRIL", tahun: cur.tahun },
    { bulan: cur.bulan.toUpperCase(), tahun: cur.tahun },
  ]
  const periodeRows = periodeDefs.map((p) => ({
    id: randomUUID(),
    bulan: p.bulan,
    tahun: p.tahun,
    urutan: periodeUrutan(p.bulan, p.tahun),
  }))
  await prisma.periode.createMany({ data: periodeRows })
  const currentPeriode = periodeRows[periodeRows.length - 1]
  console.log(`Periode: ${periodeRows.length} (terkini: ${currentPeriode.bulan} ${currentPeriode.tahun})`)

  // ---- Master hierarki + kumpulkan objek untuk catatan ----
  const regionalRows: { id: string; kode: string; nama: string }[] = []
  const pelabuhanRows: { id: string; nama: string; operatorDefault: string | null; regionalId: string }[] = []
  const fasilitasRows: {
    id: string; nama: string; konstruksi: string | null; operator: string | null; pelabuhanId: string; kategoriId: string
  }[] = []
  const objekRows: {
    id: string; nama: string; satuan: string; panjang: number | null; lebar: number | null;
    luas: number | null; jumlah: number | null; fasilitasId: string
  }[] = []
  // objek + fakta seed untuk generate catatan
  const objekFakta: {
    objekId: string; fasilitasId: string; pelabuhanId: string; seed: SeedObjek
  }[] = []

  let regIdx = 0
  for (const reg of data.regionals) {
    regIdx++
    const regId = randomUUID()
    const kode = reg.nama.replace(/[^0-9]/g, "") || String(regIdx)
    regionalRows.push({ id: regId, kode: `REG${kode}`, nama: reg.nama })

    for (const pel of reg.pelabuhan) {
      const pelId = randomUUID()
      pelabuhanRows.push({ id: pelId, nama: pel.nama, operatorDefault: pel.operatorDefault, regionalId: regId })

      for (const kat of pel.kategori) {
        const katId = kategoriId.get(kat.nama)!
        for (const fas of kat.fasilitas) {
          const fasId = randomUUID()
          fasilitasRows.push({
            id: fasId, nama: fas.nama, konstruksi: fas.konstruksi,
            operator: fas.operator ?? pel.operatorDefault, pelabuhanId: pelId, kategoriId: katId,
          })
          for (const obj of fas.objek) {
            const objId = randomUUID()
            objekRows.push({
              id: objId, nama: obj.nama, satuan: obj.satuan,
              panjang: obj.panjang, lebar: obj.lebar, luas: obj.luas, jumlah: obj.jumlah,
              fasilitasId: fasId,
            })
            objekFakta.push({ objekId: objId, fasilitasId: fasId, pelabuhanId: pelId, seed: obj })
          }
        }
      }
    }
  }

  await prisma.regional.createMany({ data: regionalRows })
  await prisma.pelabuhan.createMany({ data: pelabuhanRows })
  await batchCreate("fasilitas", fasilitasRows, (rows) => prisma.fasilitas.createMany({ data: rows }))
  await batchCreate("objek", objekRows, (rows) => prisma.objekFasilitas.createMany({ data: rows }))
  console.log(`Regional: ${regionalRows.length}, Pelabuhan: ${pelabuhanRows.length}, Fasilitas: ${fasilitasRows.length}, Objek: ${objekRows.length}`)

  // ---- Inspeksi per pelabuhan x periode ----
  const inspeksiRows: { id: string; pelabuhanId: string; periodeId: string; status: "DRAFT" | "DIAJUKAN" | "DIVERIFIKASI" }[] = []
  const inspeksiId = new Map<string, string>() // `${pelId}|${periodeId}` -> id
  for (const pel of pelabuhanRows) {
    for (const per of periodeRows) {
      const id = randomUUID()
      inspeksiId.set(`${pel.id}|${per.id}`, id)
      // periode historis diverifikasi, periode terkini diajukan
      const status = per.id === currentPeriode.id ? "DIAJUKAN" : "DIVERIFIKASI"
      inspeksiRows.push({ id, pelabuhanId: pel.id, periodeId: per.id, status })
    }
  }
  await batchCreate("inspeksi", inspeksiRows, (rows) => prisma.inspeksi.createMany({ data: rows }))
  console.log(`Inspeksi: ${inspeksiRows.length}`)

  // ---- Catatan objek per periode (dengan variasi historis) ----
  const catatanRows: {
    id: string; inspeksiId: string; objekId: string; fasilitasId: string; periodeId: string;
    tersedia: number; rusakRingan: number; rusakSedang: number; rusakBerat: number; siapPakai: number; keterangan: string | null
  }[] = []

  const lastUrutan = currentPeriode.urutan
  for (const fakta of objekFakta) {
    const tersedia = num(fakta.seed.tersedia)
    const siapCur = Math.min(tersedia, num(fakta.seed.siapPakai))
    const ratio = tersedia > 0 ? siapCur / tersedia : 0
    const seedHash = hashStr(fakta.objekId)

    for (const per of periodeRows) {
      const inspId = inspeksiId.get(`${fakta.pelabuhanId}|${per.id}`)!
      let siap: number
      let rr = num(fakta.seed.rusakRingan)
      let rs = num(fakta.seed.rusakSedang)
      let rb = num(fakta.seed.rusakBerat)

      if (per.id === currentPeriode.id) {
        siap = siapCur
      } else {
        // jarak periode ke terkini (bulan)
        const d = Math.max(1, Math.round((lastUrutan - per.urutan)))
        const dNorm = (lastUrutan - per.urutan) % 100 || 1
        const drift = 0.02 * Math.min(6, dNorm)
        const noise = (((seedHash + dNorm) % 5) - 2) / 100
        const r = Math.max(0, Math.min(1, ratio - drift + noise))
        siap = Math.round(tersedia * r * 100) / 100
        const rusak = Math.round((tersedia - siap) * 100) / 100
        rr = rusak
        rs = 0
        rb = 0
        void d
      }

      catatanRows.push({
        id: randomUUID(),
        inspeksiId: inspId,
        objekId: fakta.objekId,
        fasilitasId: fakta.fasilitasId,
        periodeId: per.id,
        tersedia,
        rusakRingan: rr,
        rusakSedang: rs,
        rusakBerat: rb,
        siapPakai: siap,
        keterangan: per.id === currentPeriode.id ? fakta.seed.keterangan : null,
      })
    }
  }
  await batchCreate("catatan", catatanRows, (rows) => prisma.catatanObjek.createMany({ data: rows }))
  console.log(`Catatan Objek: ${catatanRows.length}`)

  // ---- Users ----
  const pass = await bcrypt.hash("password123", 10)
  const regional2 = regionalRows.find((r) => /2/.test(r.nama)) ?? regionalRows[0]
  const tjPriok = pelabuhanRows.find((p) => p.nama.toLowerCase().includes("tanjung priok"))
  await prisma.user.createMany({
    data: [
      { id: randomUUID(), email: "admin@pelindo.co.id", nama: "Administrator", passwordHash: pass, role: Role.ADMIN },
      { id: randomUUID(), email: "petugas@pelindo.co.id", nama: "Petugas Tanjung Priok", passwordHash: pass, role: Role.PETUGAS, regionalId: regional2.id, pelabuhanId: tjPriok?.id ?? null },
      { id: randomUUID(), email: "pic@pelindo.co.id", nama: "PIC Regional 2", passwordHash: pass, role: Role.PIC_REGIONAL, regionalId: regional2.id },
      { id: randomUUID(), email: "manajemen@pelindo.co.id", nama: "Manajemen", passwordHash: pass, role: Role.MANAJEMEN },
    ],
  })
  console.log("Users: 4 (password semua: password123)")

  console.log("\nSeed selesai.")
}

async function batchCreate<T>(label: string, rows: T[], fn: (batch: T[]) => Promise<unknown>, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
