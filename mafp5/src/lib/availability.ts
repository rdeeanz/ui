/**
 * Aturan kalkulasi availability (mengikuti PRD §6).
 *
 * 1. Availability Objek (%)  = siapPakai / tersedia * 100
 *    - tersedia = 0  -> null (ditampilkan "N/A", bukan #DIV/0!)
 * 2. Availability Fasilitas  = rata-rata availability objek (objek dengan tersedia > 0)
 * 3. Availability Kategori   = rata-rata availability fasilitas
 * 4. Availability Pelabuhan  = rata-rata seluruh kategori
 * 5. Availability Regional   = rata-rata seluruh pelabuhan
 *
 * Semua kalkulasi berbasis rata-rata bertingkat (bukan pembobotan luas),
 * konsisten dengan format sheet "Rekap Regional".
 */

export type KondisiTingkat = "baik" | "perhatian" | "kritis"

export const AMBANG_BAIK = 90
export const AMBANG_PERHATIAN = 70

export function availabilityObjek(tersedia: number, siapPakai: number): number | null {
  if (!tersedia || tersedia <= 0) return null
  const pct = (siapPakai / tersedia) * 100
  if (!Number.isFinite(pct)) return null
  return clampPct(pct)
}

export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n))
}

/** Rata-rata dari daftar nilai availability, mengabaikan null (N/A). */
export function rataRata(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function tingkatKondisi(pct: number | null): KondisiTingkat | null {
  if (pct == null) return null
  if (pct >= AMBANG_BAIK) return "baik"
  if (pct >= AMBANG_PERHATIAN) return "perhatian"
  return "kritis"
}

export const LABEL_KONDISI: Record<KondisiTingkat, string> = {
  baik: "Baik",
  perhatian: "Perhatian",
  kritis: "Kritis",
}

/** Format persen untuk locale ID. Null -> "N/A". */
export function formatPct(pct: number | null | undefined, digits = 2): string {
  if (pct == null || !Number.isFinite(pct)) return "N/A"
  return `${pct.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`
}

export function formatAngka(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "-"
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}
