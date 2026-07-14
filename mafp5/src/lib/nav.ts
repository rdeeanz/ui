import {
  LayoutDashboard,
  ClipboardList,
  FileSpreadsheet,
  TrendingUp,
  Database,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { Role } from "@/lib/roles"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
  exact?: boolean
}

const ALL: Role[] = ["ADMIN", "PETUGAS", "PIC_REGIONAL", "MANAJEMEN"]

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ALL, exact: true },
  { label: "Input Inspeksi", href: "/inspeksi", icon: ClipboardList, roles: ["ADMIN", "PETUGAS", "PIC_REGIONAL"] },
  { label: "Rekapitulasi", href: "/rekap", icon: FileSpreadsheet, roles: ALL },
  { label: "Histori & Tren", href: "/histori", icon: TrendingUp, roles: ALL },
  { label: "Master Data", href: "/master", icon: Database, roles: ["ADMIN"] },
  { label: "Pengguna", href: "/users", icon: Users, roles: ["ADMIN"] },
]

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role))
}
