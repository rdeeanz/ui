# PRD — Aplikasi Web Monitoring Availability Fasilitas Sipil

**Produk:** Sistem Monitoring Availability Kondisi Fasilitas Sipil
**Organisasi:** PT Pelabuhan Indonesia (Persero)
**Versi Dokumen:** 1.0
**Status:** Draft
**Sumber Data:** `data-output-regional2.xlsx` (data inspeksi per pelabuhan), `template-output-rekap.xlsx` (format rekapitulasi & histori bulanan)

---

## 1. Ringkasan

Aplikasi web internal untuk memantau **availability (ketersediaan/kesiapan)** fasilitas sipil pelabuhan (dermaga, lapangan penumpukan, gudang, terminal penumpang, dll) secara periodik di seluruh Regional dan Pelabuhan PT Pelabuhan Indonesia (Persero). Aplikasi menggantikan proses pelaporan berbasis Excel manual dengan input terstruktur, kalkulasi availability otomatis, dashboard visual, dan rekapitulasi multi-level (objek → fasilitas → pelabuhan → regional).

## 2. Latar Belakang & Masalah

- Pelaporan saat ini tersebar di banyak file Excel per pelabuhan/periode dengan formula manual (banyak sel `#DIV/0!`), rawan error dan sulit dikonsolidasi.
- Tidak ada satu sumber kebenaran (single source of truth) untuk kondisi fasilitas lintas regional.
- Tren availability antar periode sulit dianalisis karena data historis terpisah per sheet bulanan.

## 3. Tujuan & Metrik Keberhasilan

| Tujuan | Metrik |
|---|---|
| Sentralisasi data monitoring | 100% pelabuhan input via aplikasi (bukan Excel) |
| Otomatisasi kalkulasi availability | 0 kalkulasi manual; tidak ada error `#DIV/0!` |
| Visibilitas kondisi real-time | Dashboard regional & nasional < 3 detik load |
| Efisiensi pelaporan | Rekap regional otomatis, waktu penyusunan turun signifikan |
| Analisis tren | Perbandingan availability antar periode tersedia |

**Di luar cakupan (v1):** manajemen anggaran/biaya perbaikan, work order/maintenance workflow, integrasi IoT sensor, mobile native app.

## 4. Pengguna & Peran

| Peran | Hak Akses |
|---|---|
| **Admin Sistem** | Kelola master data, user, regional, pelabuhan, jenis fasilitas |
| **Petugas Pelabuhan (Cabang)** | Input & edit data inspeksi fasilitas pelabuhan sendiri |
| **PIC Regional** | Review & verifikasi data pelabuhan dalam regionalnya, lihat rekap regional |
| **Manajemen / Direksi** | Dashboard read-only lintas regional (nasional) |

## 5. Model Data

Hierarki: **Regional → Pelabuhan → Kategori Fasilitas → Nama Fasilitas → Objek Fasilitas → Catatan Periode**

**Regional** — kode, nama (mis. Regional 2).
**Pelabuhan** — nama (Tanjung Priok, Panjang, Banten, ...), regional, operator (SPTP/SPMT/SPSL).
**Kategori Fasilitas** — Dermaga, Lapangan Penumpukan, Gudang, Terminal Penumpang, dst.
**Fasilitas** — nama (mis. "Dermaga 01"), kategori, konstruksi (Beton, Tiang Pancang, Baja, ...), operator.
**Objek Fasilitas** — komponen terukur dari fasilitas (Pelat Lantai, Fender, Bolder, Kanstin, Rel Crane, Lapangan, Atap, ...):

| Field | Satuan | Keterangan |
|---|---|---|
| Panjang | m | dimensi |
| Lebar | m | dimensi |
| Luas | m² | dimensi |
| Jumlah | unit | untuk objek berbasis unit |
| Fasilitas Tersedia | unit/m/m² | total kapasitas terpasang |
| Rusak Ringan | unit/m/m² | |
| Rusak Sedang | unit/m/m² | |
| Rusak Berat | unit/m/m² | |
| Fasilitas Siap Pakai | unit/m/m² | tersedia dikurangi porsi rusak tidak layak |
| Availability Objek | % | terhitung |
| Keterangan | teks | catatan kondisi |

**Periode Monitoring** — bulan + tahun (mis. MEI 2026); setiap catatan objek terikat ke satu periode untuk histori tren.

## 6. Aturan Kalkulasi Availability

1. **Availability Objek (%)** = `Fasilitas Siap Pakai / Fasilitas Tersedia × 100`
   - Jika `Fasilitas Tersedia = 0` → tampilkan `N/A` (bukan `#DIV/0!`).
2. **Availability Fasilitas (%)** = rata-rata Availability Objek dari seluruh objek dalam fasilitas tersebut.
3. **Availability per Kategori (per pelabuhan/regional)** = rata-rata Availability Fasilitas dalam kategori.
4. **Availability Pelabuhan** = rata-rata seluruh kategori di pelabuhan.
5. **Availability Regional** = rata-rata seluruh pelabuhan/kategori (sesuai format sheet "Rekap Regional").

Semua kalkulasi dilakukan server-side, disimpan tervalidasi, dan ditampilkan konsisten di seluruh view.

## 7. Kebutuhan Fungsional

**F1. Autentikasi & Otorisasi** — login, role-based access (peran di §4).

**F2. Master Data** — CRUD Regional, Pelabuhan, Kategori Fasilitas, Fasilitas, Objek Fasilitas, Operator; kelola periode monitoring.

**F3. Input Data Inspeksi** — form terstruktur per fasilitas & objek per periode; kalkulasi availability otomatis dan real-time saat input; validasi (rusak ≤ tersedia, angka non-negatif).

**F4. Import / Export Excel** — import data dari template Excel eksisting (`data-output-regional2.xlsx`), export rekap ke format `template-output-rekap.xlsx` (sheet "Rekap Regional" & "Lap. Cabang"), export PDF laporan.

**F5. Dashboard**
- Ringkasan nasional: availability rata-rata, jumlah fasilitas, distribusi kondisi (baik/rusak ringan/sedang/berat).
- Drill-down Regional → Pelabuhan → Kategori → Fasilitas.
- Kartu KPI, chart tren periode, chart komparasi antar pelabuhan/regional.
- Daftar fasilitas kondisi kritis (availability rendah / rusak berat).

**F6. Rekapitulasi** — generate rekap availability per regional & per periode mengikuti struktur "Rekap Regional" (No., Fasilitas, Lokasi, Availability %, subtotal per kategori, total regional).

**F7. Histori & Tren** — simpan snapshot per periode; grafik tren availability lintas bulan/tahun (mengikuti pola sheet bulanan `FEB-2024`, `MAR-2024`, ...).

**F8. Filter & Pencarian** — filter global by regional, pelabuhan, kategori, periode, kondisi; pencarian nama fasilitas.

**F9. Verifikasi Data** — alur review PIC Regional (draft → diajukan → diverifikasi).

## 8. Kebutuhan Non-Fungsional

- **Performa:** dashboard utama < 3 detik pada dataset ribuan baris (data regional memiliki 600+ baris per pelabuhan).
- **Keamanan:** autentikasi wajib, RBAC, audit trail perubahan data, proteksi terhadap injeksi; endpoint API terlindungi (tidak ada endpoint tanpa autentikasi).
- **Aksesibilitas:** komponen shadcn/ui yang WCAG-compliant, navigasi keyboard.
- **Responsif:** desktop-first, tetap usable di tablet.
- **Lokalisasi:** Bahasa Indonesia; format angka & persen sesuai locale ID.
- **Skalabilitas:** mendukung penambahan regional/pelabuhan tanpa perubahan skema.

## 9. Desain Sistem & Teknologi

Mengikuti stack dan konvensi yang ada di codebase ini.

- **Framework:** Next.js (App Router) + React 19 + TypeScript (ESM).
- **UI:** **shadcn/ui** sebagai design system utama (komponen di-*copy* ke proyek, bukan dependency), Tailwind CSS v4, token semantik (`bg-primary`, `text-muted-foreground`), ikon `lucide-react`.
- **Charts:** komponen Chart shadcn/ui (berbasis Recharts).
- **Data & State:** Server Components + Server Actions untuk mutasi; validasi dengan `zod`.
- **Database:** relasional (PostgreSQL) dengan ORM (mis. Prisma/Drizzle) sesuai preferensi tim.
- **Export:** library spreadsheet (mis. `exceljs`) untuk output kompatibel template Excel; PDF untuk laporan.
- **Referensi Dokumentasi:** **selalu gunakan context7** untuk mengambil dokumentasi terkini setiap library/komponen (shadcn/ui, Next.js, Tailwind v4, Recharts, ORM, dsb.) sebelum implementasi, agar API dan pola yang dipakai selalu up-to-date.

### 9.1 Pemetaan Halaman → Komponen shadcn/ui

| Halaman | Komponen shadcn/ui |
|---|---|
| Layout & navigasi | `Sidebar`, `Breadcrumb`, `NavigationMenu`, `Sheet`, `DropdownMenu` |
| Dashboard | `Card`, `Chart`, `Badge`, `Tabs`, `Progress`, `Separator` |
| Tabel data & rekap | `Table` + TanStack Table, `Pagination`, `Badge` (status kondisi), `Tooltip` |
| Form input inspeksi | `Form` (react-hook-form + zod), `Input`, `Select`, `Combobox`, `Textarea`, `Checkbox` |
| Filter global | `Select`, `Popover`, `Calendar`/`DatePicker`, `Command` |
| Aksi & konfirmasi | `Button`, `Dialog`, `AlertDialog`, `Toast`/`Sonner` |
| Import/Export | `Dialog`, `Button`, `Progress` |
| Manajemen user/master | `Table`, `Dialog`, `Form`, `Switch` |

> Catatan parity: komponen bersumber dari registry shadcn/ui (base `radix`/`base`); gunakan CLI `shadcn add` untuk menambahkan komponen. Untuk detail otoritatif ikuti `skills/shadcn/` di repo.

### 9.2 Status Kondisi (visual)

Gunakan `Badge` dengan token semantik: Availability ≥ 90% (baik), 70–89% (perhatian), < 70% (kritis). Distribusi kerusakan ditampilkan sebagai stacked bar/donut chart.

## 10. Struktur Navigasi

```
/                      Dashboard Nasional
/regional/[id]         Dashboard & rekap per Regional
/pelabuhan/[id]        Detail pelabuhan (kategori → fasilitas → objek)
/inspeksi/new          Form input data periode
/rekap                 Rekapitulasi (export Excel/PDF)
/histori               Tren availability antar periode
/master                Master data (admin)
/users                 Manajemen pengguna (admin)
```

## 11. Roadmap (Bertahap)

1. **M1 — Fondasi:** auth + RBAC, master data, skema DB, layout shadcn/ui.
2. **M2 — Input & Kalkulasi:** form inspeksi + kalkulasi availability otomatis + validasi.
3. **M3 — Dashboard & Rekap:** dashboard multi-level, chart, rekap regional.
4. **M4 — Import/Export & Histori:** import Excel eksisting, export template rekap/PDF, tren periode.
5. **M5 — Penyempurnaan:** verifikasi data, audit trail, optimasi performa, aksesibilitas.

## 12. Asumsi & Risiko

- **Asumsi:** struktur data mengikuti file sumber; satu periode = kombinasi bulan+tahun; availability memakai rata-rata (bukan pembobotan luas) sesuai format rekap eksisting.
- **Risiko:** kualitas data Excel eksisting tidak konsisten (baris contoh, sel kosong, `#DIV/0!`) → butuh normalisasi saat import; definisi "Siap Pakai" perlu dikonfirmasi ke tim teknik untuk konsistensi kalkulasi.

## 13. Pertanyaan Terbuka

1. Apakah availability perlu dibobot berdasarkan luas/nilai aset, atau tetap rata-rata sederhana? Jawab: tetap rata-rata sederhana
2. Frekuensi periode resmi: bulanan, semesteran, atau keduanya (data sumber memuat "MEI" dan "SEMESTER PERTAMA")? Jawab: bulanan
3. Apakah perlu dukungan multi-regional penuh di v1 atau fokus Regional 2 dahulu? Jawab: ya, perlu dukungan multi-regional penuh di v1
