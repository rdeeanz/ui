import "server-only"
import ExcelJS from "exceljs"

export type ParsedObjek = {
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
  keterangan: string | null
}
export type ParsedFasilitas = {
  nama: string
  konstruksi: string | null
  operator: string | null
  objek: ParsedObjek[]
}
export type ParsedKategori = { nama: string; urutan: number; fasilitas: ParsedFasilitas[] }
export type ParsedPelabuhan = {
  regionalNama: string
  nama: string
  operatorDefault: string | null
  bulan: string
  tahun: number
  kategori: ParsedKategori[]
}

const ROMAN = new Set([
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV",
])
const MONTHLY = /^[A-Z]{3}-\d{4}$/

function txt(v: ExcelJS.CellValue): string | null {
  if (v == null) return null
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text).trim() || null
  const s = String(v).trim()
  return s || null
}
function num(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "object" && v && "result" in v) {
    const r = (v as { result?: unknown }).result
    return typeof r === "number" && Number.isFinite(r) ? r : null
  }
  return null
}
function n0(v: ExcelJS.CellValue): number {
  return num(v) ?? 0
}
function satuan(p: number | null, l: number | null, luas: number | null, j: number | null): string {
  if (luas) return "m2"
  if (j) return "unit"
  if (p) return "m"
  return "unit"
}

/**
 * exceljs `row.values` is 1-based (index 1 = column A). Drop the leading slot so
 * that index 0 = column A, matching the 0-based tuples used when the seed was
 * extracted (i.e. c[1] = column B = "No.").
 */
function rowVals(ws: ExcelJS.Worksheet, i: number): ExcelJS.CellValue[] {
  const raw = ws.getRow(i).values
  if (Array.isArray(raw)) return raw.slice(1)
  return []
}

/** Parse workbook buffer -> daftar pelabuhan (mengabaikan sheet histori bulanan). */
export async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedPelabuhan[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const out: ParsedPelabuhan[] = []

  wb.eachSheet((ws) => {
    const title = ws.name.trim()
    if (MONTHLY.test(title)) return

    let regionalNama: string | null = null
    let namaPel = title
    let bulan = "MEI"
    let tahun = new Date().getFullYear()
    const m3 = title.match(/Lap\.\s*Reg3\s*Cab\.\s*(.+)/i)
    if (m3) {
      regionalNama = "REGIONAL 3"
      namaPel = m3[1].trim()
    }

    // scan metadata (first 10 rows)
    for (let i = 1; i <= Math.min(10, ws.rowCount); i++) {
      const cells = rowVals(ws, i)
      const joined = cells.map((c) => txt(c) ?? "").join(" ")
      const rg = joined.match(/(REGIONAL\s*\d+)/i)
      if (rg && !regionalNama) regionalNama = rg[1].toUpperCase()
      for (let j = 0; j < cells.length; j++) {
        const c = txt(cells[j])
        if (!c) continue
        const up = c.toUpperCase()
        const val = () => {
          for (let k = j + 1; k < cells.length; k++) {
            const c2 = txt(cells[k])
            if (c2 && c2.startsWith(":")) return c2.replace(/^:/, "").trim()
          }
          return null
        }
        if (up.startsWith("PELABUHAN") && !m3) {
          const v = val()
          if (v) namaPel = v.toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase())
        } else if (up.startsWith("PERIODIK")) {
          const v = val()
          if (v) bulan = v.toUpperCase()
        } else if (up.startsWith("TAHUN")) {
          const v = val()
          if (v && /^\d{4}$/.test(v)) tahun = parseInt(v, 10)
        }
      }
    }

    // find header numbering row (1,2,3,...)
    let start = 0
    for (let i = 1; i <= ws.rowCount; i++) {
      const c = rowVals(ws, i)
      if (num(c[1]) === 1 && num(c[2]) === 2 && num(c[3]) === 3) {
        start = i + 1
        break
      }
    }
    if (!start) return

    const kategori: ParsedKategori[] = []
    let curKat: ParsedKategori | null = null
    let curFas: ParsedFasilitas | null = null
    let operatorDefault: string | null = null
    let katUrut = 0

    for (let i = start; i <= ws.rowCount; i++) {
      const c = rowVals(ws, i)
      const no = txt(c[1])
      const fasilitas = txt(c[2])
      const namaFas = txt(c[3])
      const objek = txt(c[4])
      const panjang = num(c[5])
      const lebar = num(c[6])
      const luas = num(c[7])
      const jumlah = num(c[8])
      const konstruksi = txt(c[9])
      const tersedia = n0(c[10])
      const rr = n0(c[11])
      const rs = n0(c[12])
      const rb = n0(c[13])
      const siap = n0(c[14])
      const operator = txt(c[17])
      const ket = txt(c[18])

      if (fasilitas && fasilitas.toLowerCase().startsWith("contoh")) continue

      if (no && ROMAN.has(no) && fasilitas && !objek && !namaFas) {
        katUrut++
        curKat = { nama: fasilitas.toUpperCase(), urutan: katUrut, fasilitas: [] }
        kategori.push(curKat)
        curFas = null
        continue
      }
      if (namaFas) {
        if (!curKat) {
          katUrut++
          curKat = { nama: (fasilitas ?? "LAINNYA").toUpperCase(), urutan: katUrut, fasilitas: [] }
          kategori.push(curKat)
        }
        curFas = { nama: namaFas, konstruksi, operator, objek: [] }
        curKat.fasilitas.push(curFas)
        if (operator && !operatorDefault) operatorDefault = operator
        if (objek) {
          curFas.objek.push({
            nama: objek, satuan: satuan(panjang, lebar, luas, jumlah),
            panjang, lebar, luas, jumlah, tersedia, rusakRingan: rr, rusakSedang: rs, rusakBerat: rb,
            siapPakai: siap, keterangan: ket,
          })
        }
        continue
      }
      if (objek && curFas) {
        curFas.objek.push({
          nama: objek, satuan: satuan(panjang, lebar, luas, jumlah),
          panjang, lebar, luas, jumlah, tersedia, rusakRingan: rr, rusakSedang: rs, rusakBerat: rb,
          siapPakai: siap, keterangan: ket,
        })
      }
    }

    const filtered = kategori
      .map((k) => ({ ...k, fasilitas: k.fasilitas.filter((f) => f.objek.length) }))
      .filter((k) => k.fasilitas.length)
    if (filtered.length) {
      out.push({
        regionalNama: regionalNama ?? "REGIONAL 2",
        nama: namaPel,
        operatorDefault,
        bulan,
        tahun,
        kategori: filtered,
      })
    }
  })

  return out
}
