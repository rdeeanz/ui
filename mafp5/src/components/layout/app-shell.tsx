"use client"

import * as React from "react"
import Link from "next/link"
import { Anchor, Menu } from "lucide-react"

import { SidebarNav } from "@/components/layout/sidebar-nav"
import { UserMenu } from "@/components/layout/user-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { navFor } from "@/lib/nav"
import type { Role } from "@/lib/roles"

function SidebarBody({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = navFor(role)
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Anchor className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Monitoring Availability</span>
          <span className="text-muted-foreground text-[11px]">Fasilitas Sipil Pelindo</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav items={items} onNavigate={onNavigate} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t p-3">
        <span className="text-muted-foreground text-[11px]">
          PT Pelabuhan Indonesia (Persero)
        </span>
        <ModeToggle />
      </div>
    </div>
  )
}

export function AppShell({
  nama,
  email,
  role,
  periodeLabel,
  children,
}: {
  nama: string
  email: string
  role: Role
  periodeLabel?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="bg-muted/40 min-h-svh">
      {/* Sidebar desktop */}
      <aside className="bg-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r md:block">
        <SidebarBody role={role} />
      </aside>

      {/* Konten */}
      <div className="md:pl-64">
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="size-4" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle>Menu navigasi</SheetTitle>
              <SidebarBody role={role} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {periodeLabel && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Periode: {periodeLabel}
            </Badge>
          )}
          <UserMenu nama={nama} email={email} role={role} />
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
