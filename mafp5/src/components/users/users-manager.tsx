"use client"

import * as React from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { simpanUser, toggleUserAktif } from "@/app/actions/users"

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrator" },
  { value: "PETUGAS", label: "Petugas Pelabuhan" },
  { value: "PIC_REGIONAL", label: "PIC Regional" },
  { value: "MANAJEMEN", label: "Manajemen" },
]

export type UserRow = {
  id: string
  nama: string
  email: string
  role: string
  regionalId: string | null
  pelabuhanId: string | null
  aktif: boolean
  regionalNama: string | null
  pelabuhanNama: string | null
}

type Form = {
  nama: string
  email: string
  role: string
  password: string
  regionalId: string
  pelabuhanId: string
}

const EMPTY: Form = { nama: "", email: "", role: "PETUGAS", password: "", regionalId: "", pelabuhanId: "" }
const NONE = "__none__"

export function UsersManager({
  users,
  regionals,
  pelabuhan,
}: {
  users: UserRow[]
  regionals: { value: string; label: string }[]
  pelabuhan: { value: string; label: string }[]
}) {
  const [open, setOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<Form>(EMPTY)
  const [pending, startTransition] = React.useTransition()

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(u: UserRow) {
    setEditingId(u.id)
    setForm({
      nama: u.nama,
      email: u.email,
      role: u.role,
      password: "",
      regionalId: u.regionalId ?? "",
      pelabuhanId: u.pelabuhanId ?? "",
    })
    setOpen(true)
  }

  function submit() {
    startTransition(async () => {
      const res = await simpanUser({
        id: editingId ?? undefined,
        nama: form.nama,
        email: form.email,
        role: form.role,
        password: form.password || undefined,
        regionalId: form.regionalId || null,
        pelabuhanId: form.pelabuhanId || null,
      })
      if (res.ok) {
        toast.success(res.message)
        setOpen(false)
      } else toast.error(res.message)
    })
  }

  function toggle(u: UserRow) {
    startTransition(async () => {
      const res = await toggleUserAktif(u.id, !u.aktif)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Tambah Pengguna
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Cakupan</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nama}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_OPTIONS.find((r) => r.value === u.role)?.label ?? u.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {u.pelabuhanNama ?? u.regionalNama ?? "Semua"}
                </TableCell>
                <TableCell>
                  <Switch checked={u.aktif} onCheckedChange={() => toggle(u)} disabled={pending} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                    Ubah
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Ubah Pengguna" : "Tambah Pengguna"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Kosongkan kata sandi jika tidak ingin mengubahnya." : "Kata sandi minimal 6 karakter."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Nama">
              <Input value={form.nama} onChange={(e) => setForm((s) => ({ ...s, nama: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </Field>
            <Field label="Peran">
              <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Regional (opsional)">
              <Select
                value={form.regionalId || NONE}
                onValueChange={(v) => setForm((s) => ({ ...s, regionalId: v === NONE ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua regional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Semua regional</SelectItem>
                  {regionals.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Pelabuhan (opsional)">
              <Select
                value={form.pelabuhanId || NONE}
                onValueChange={(v) => setForm((s) => ({ ...s, pelabuhanId: v === NONE ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua pelabuhan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Semua pelabuhan</SelectItem>
                  {pelabuhan.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={editingId ? "Kata Sandi Baru" : "Kata Sandi"}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
