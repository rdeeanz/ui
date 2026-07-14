"use client"

import { LogOut } from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ROLE_LABEL, type Role } from "@/lib/roles"

export function UserMenu({
  nama,
  email,
  role,
}: {
  nama: string
  email: string
  role: Role
}) {
  const inisial = nama
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">{inisial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">{nama}</span>
            <span className="text-muted-foreground text-xs font-normal">{email}</span>
            <span className="text-muted-foreground mt-1 text-xs font-normal">{ROLE_LABEL[role]}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem variant="destructive" asChild>
              <span className="cursor-pointer">
                <LogOut className="size-4" />
                Keluar
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
