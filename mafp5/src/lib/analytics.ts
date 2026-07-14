import "server-only"

import { prisma } from "@/lib/prisma"
import { availabilityObjek, rataRata, tingkatKondisi, type KondisiTingkat } from "@/lib/availability"

export type PeriodeInfo = { id: string; bulan: string; tahun: number; urutan: number }

export function labelPeriode(p: { bulan: string; tahun: number }): string {
  const b = p.bulan.charAt(0) + p.bulan.slice(1).toLowerCase()
  return `${b} ${p.tahun}`
}

export async function getPeriodeList(): Promise<PeriodeInfo[]> {
  return prisma.periode.findMany({ orderBy: { urutan: "asc" } })
}

export async function getCurrentPeriode(): Promise<PeriodeInfo | null> {
  return prisma.periode.findFirst({ orderBy: { urutan: "desc" } })
}

export async function resolvePeriode(periodeId?: string): Promise<PeriodeInfo | null> {
  if (periodeId) {
    const p = await prisma.periode.findUnique({ where: { id: periodeId } })
    if (p) return p
  }
  return getCurrentPeriode()
}

export type ScopeFilter = {
  regionalId?: string
  pelabuhanId?: string
  kategoriId?: string
}

export type FasilitasAgg = {
  fasilitasId: string
  nama: string
  konstruksi: string | null
  operator: string | null
  kategoriId: string
  kategoriNama: string
  kategoriUrutan: number
  pelabuhanId: string
  pelabuhanNama: string
  regionalId: string
  regionalNama: string
  availability: number | null
  jumlahObjek: number
  rusakRingan: number
  rusakSedang: number
  rusakBerat: number
}

/** Ambil catatan objek 1 periode + hitung availability per fasilitas. */
export async function getFasilitasAvailability(
  periodeId: string,
  filter: ScopeFilter = {}
): Promise<FasilitasAgg[]> {
  const catatan = await prisma.catatanObjek.findMany({
    where: {
      periodeId,
      fasilitas: {
        ...(filter.kategoriId ? { kategoriId: filter.kategoriId } : {}),
        pelabuhan: {
          ...(filter.pelabuhanId ? { id: filter.pelabuhanId } : {}),
          ...(filter.regionalId ? { regionalId: filter.regionalId } : {}),
        },
      },
    },
    select: {
      tersedia: true,
      siapPakai: true,
      rusakRingan: true,
      rusakSedang: true,
      rusakBerat: true,
      fasilitasId: true,
      fasilitas: {
        select: {
          nama: true,
          konstruksi: true,
          operator: true,
          kategoriId: true,
          kategori: { select: { nama: true, urutan: true } },
          pelabuhan: {
            select: { id: true, nama: true, regionalId: true, regional: { select: { nama: true } } },
          },
        },
      },
    },
  })

  const map = new Map<string, FasilitasAgg & { _avails: (number | null)[] }>()

  for (const c of catatan) {
    const f = c.fasilitas
    let agg = map.get(c.fasilitasId)
    if (!agg) {
      agg = {
        fasilitasId: c.fasilitasId,
        nama: f.nama,
        konstruksi: f.konstruksi,
        operator: f.operator,
        kategoriId: f.kategoriId,
        kategoriNama: f.kategori.nama,
        kategoriUrutan: f.kategori.urutan,
        pelabuhanId: f.pelabuhan.id,
        pelabuhanNama: f.pelabuhan.nama,
        regionalId: f.pelabuhan.regionalId,
        regionalNama: f.pelabuhan.regional.nama,
        availability: null,
        jumlahObjek: 0,
        rusakRingan: 0,
        rusakSedang: 0,
        rusakBerat: 0,
        _avails: [],
      }
      map.set(c.fasilitasId, agg)
    }
    agg.jumlahObjek += 1
    agg.rusakRingan += c.rusakRingan
    agg.rusakSedang += c.rusakSedang
    agg.rusakBerat += c.rusakBerat
    agg._avails.push(availabilityObjek(c.tersedia, c.siapPakai))
  }

  return [...map.values()].map(({ _avails, ...rest }) => ({
    ...rest,
    availability: rataRata(_avails),
  }))
}

export type GroupAgg = {
  id: string
  nama: string
  availability: number | null
  jumlahFasilitas: number
}

export function groupByKategori(rows: FasilitasAgg[]): GroupAgg[] {
  return groupBy(rows, (r) => ({ id: r.kategoriId, nama: r.kategoriNama, sort: r.kategoriUrutan })).sort(
    (a, b) => a._sort - b._sort
  )
}

export function groupByPelabuhan(rows: FasilitasAgg[]): GroupAgg[] {
  return groupBy(rows, (r) => ({ id: r.pelabuhanId, nama: r.pelabuhanNama, sort: 0 }))
}

export function groupByRegional(rows: FasilitasAgg[]): GroupAgg[] {
  return groupBy(rows, (r) => ({ id: r.regionalId, nama: r.regionalNama, sort: 0 }))
}

function groupBy(
  rows: FasilitasAgg[],
  keyFn: (r: FasilitasAgg) => { id: string; nama: string; sort: number }
): (GroupAgg & { _sort: number })[] {
  const map = new Map<string, { nama: string; sort: number; avails: (number | null)[] }>()
  for (const r of rows) {
    const k = keyFn(r)
    let g = map.get(k.id)
    if (!g) {
      g = { nama: k.nama, sort: k.sort, avails: [] }
      map.set(k.id, g)
    }
    g.avails.push(r.availability)
  }
  return [...map.entries()]
    .map(([id, g]) => ({
      id,
      nama: g.nama,
      availability: rataRata(g.avails),
      jumlahFasilitas: g.avails.length,
      _sort: g.sort,
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama))
}

export function overallAvailability(rows: FasilitasAgg[]): number | null {
  return rataRata(rows.map((r) => r.availability))
}

export function distribusiKondisi(rows: FasilitasAgg[]): Record<KondisiTingkat | "na", number> {
  const out = { baik: 0, perhatian: 0, kritis: 0, na: 0 }
  for (const r of rows) {
    const t = tingkatKondisi(r.availability)
    if (t) out[t] += 1
    else out.na += 1
  }
  return out
}

export function totalKerusakan(rows: FasilitasAgg[]) {
  return rows.reduce(
    (acc, r) => {
      acc.ringan += r.rusakRingan
      acc.sedang += r.rusakSedang
      acc.berat += r.rusakBerat
      return acc
    },
    { ringan: 0, sedang: 0, berat: 0 }
  )
}

export type ObjekDetail = {
  objekId: string
  nama: string
  satuan: string
  panjang: number | null
  lebar: number | null
  luas: number | null
  jumlah: number | null
  tersedia: number
  rusakRingan: number
  rusakSedang: number
  rusakBerat: number
  siapPakai: number
  availability: number | null
  keterangan: string | null
}
export type FasilitasDetail = {
  fasilitasId: string
  nama: string
  konstruksi: string | null
  operator: string | null
  availability: number | null
  objek: ObjekDetail[]
}
export type KategoriDetail = {
  kategoriId: string
  nama: string
  urutan: number
  availability: number | null
  fasilitas: FasilitasDetail[]
}

/** Detail lengkap 1 pelabuhan pada 1 periode (kategori>fasilitas>objek). */
export async function getDetailPelabuhan(
  pelabuhanId: string,
  periodeId: string
): Promise<KategoriDetail[]> {
  const fasilitas = await prisma.fasilitas.findMany({
    where: { pelabuhanId },
    include: {
      kategori: { select: { id: true, nama: true, urutan: true } },
      objek: {
        include: {
          catatan: { where: { periodeId } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const katMap = new Map<string, KategoriDetail>()

  for (const f of fasilitas) {
    const objek: ObjekDetail[] = f.objek.map((o) => {
      const c = o.catatan[0]
      const tersedia = c?.tersedia ?? 0
      const siapPakai = c?.siapPakai ?? 0
      return {
        objekId: o.id,
        nama: o.nama,
        satuan: o.satuan,
        panjang: o.panjang,
        lebar: o.lebar,
        luas: o.luas,
        jumlah: o.jumlah,
        tersedia,
        rusakRingan: c?.rusakRingan ?? 0,
        rusakSedang: c?.rusakSedang ?? 0,
        rusakBerat: c?.rusakBerat ?? 0,
        siapPakai,
        availability: availabilityObjek(tersedia, siapPakai),
        keterangan: c?.keterangan ?? null,
      }
    })
    const fasDetail: FasilitasDetail = {
      fasilitasId: f.id,
      nama: f.nama,
      konstruksi: f.konstruksi,
      operator: f.operator,
      availability: rataRata(objek.map((o) => o.availability)),
      objek,
    }
    let kat = katMap.get(f.kategoriId)
    if (!kat) {
      kat = {
        kategoriId: f.kategori.id,
        nama: f.kategori.nama,
        urutan: f.kategori.urutan,
        availability: null,
        fasilitas: [],
      }
      katMap.set(f.kategoriId, kat)
    }
    kat.fasilitas.push(fasDetail)
  }

  const result = [...katMap.values()].sort((a, b) => a.urutan - b.urutan)
  for (const k of result) k.availability = rataRata(k.fasilitas.map((f) => f.availability))
  return result
}

export type RekapKategori = {
  kategoriId: string
  nama: string
  urutan: number
  rows: { pelabuhanId: string; pelabuhanNama: string; availability: number | null }[]
  subtotal: number | null
}
export type RekapRegional = {
  regionalNama: string
  periodeLabel: string
  kategori: RekapKategori[]
  total: number | null
}

/** Rekapitulasi availability satu regional (format sheet "Rekap Regional"). */
export async function getRekapRegional(
  regionalId: string,
  periodeId: string
): Promise<RekapRegional> {
  const [regional, periode] = await Promise.all([
    prisma.regional.findUniqueOrThrow({ where: { id: regionalId } }),
    prisma.periode.findUniqueOrThrow({ where: { id: periodeId } }),
  ])
  const rows = await getFasilitasAvailability(periodeId, { regionalId })

  // group: kategori -> pelabuhan -> avails
  const katMap = new Map<
    string,
    { nama: string; urutan: number; pel: Map<string, { nama: string; avails: (number | null)[] }> }
  >()
  for (const r of rows) {
    let kat = katMap.get(r.kategoriId)
    if (!kat) {
      kat = { nama: r.kategoriNama, urutan: r.kategoriUrutan, pel: new Map() }
      katMap.set(r.kategoriId, kat)
    }
    let pel = kat.pel.get(r.pelabuhanId)
    if (!pel) {
      pel = { nama: r.pelabuhanNama, avails: [] }
      kat.pel.set(r.pelabuhanId, pel)
    }
    pel.avails.push(r.availability)
  }

  const kategori: RekapKategori[] = [...katMap.entries()]
    .map(([kategoriId, kat]) => {
      const rekapRows = [...kat.pel.entries()]
        .map(([pelabuhanId, pel]) => ({
          pelabuhanId,
          pelabuhanNama: pel.nama,
          availability: rataRata(pel.avails),
        }))
        .sort((a, b) => a.pelabuhanNama.localeCompare(b.pelabuhanNama))
      return {
        kategoriId,
        nama: kat.nama,
        urutan: kat.urutan,
        rows: rekapRows,
        subtotal: rataRata(rekapRows.map((r) => r.availability)),
      }
    })
    .sort((a, b) => a.urutan - b.urutan)

  return {
    regionalNama: regional.nama,
    periodeLabel: labelPeriode(periode),
    kategori,
    total: rataRata(kategori.map((k) => k.subtotal)),
  }
}

/** Tren availability nasional (atau ter-filter) per periode. */
export async function getTrenAvailability(
  filter: ScopeFilter = {}
): Promise<{ periodeId: string; label: string; availability: number | null }[]> {
  const periodes = await getPeriodeList()
  const out: { periodeId: string; label: string; availability: number | null }[] = []
  for (const p of periodes) {
    const rows = await getFasilitasAvailability(p.id, filter)
    out.push({ periodeId: p.id, label: labelPeriode(p), availability: overallAvailability(rows) })
  }
  return out
}
