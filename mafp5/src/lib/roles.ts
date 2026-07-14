// Konstanta & tipe peran yang aman dipakai di client maupun server
// (tidak mengimpor modul server-only).

export type Role = "ADMIN" | "PETUGAS" | "PIC_REGIONAL" | "MANAJEMEN"

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  PETUGAS: "Petugas Pelabuhan",
  PIC_REGIONAL: "PIC Regional",
  MANAJEMEN: "Manajemen",
}

// Kapabilitas per fitur (dipakai untuk menyembunyikan/menonaktifkan aksi UI)
export const can = {
  kelolaMasterData: (r: Role) => r === "ADMIN",
  kelolaUser: (r: Role) => r === "ADMIN",
  inputInspeksi: (r: Role) => r === "ADMIN" || r === "PETUGAS",
  verifikasi: (r: Role) => r === "ADMIN" || r === "PIC_REGIONAL",
  export: (_r: Role) => true,
  lihatSemuaRegional: (r: Role) => r === "ADMIN" || r === "MANAJEMEN",
}
