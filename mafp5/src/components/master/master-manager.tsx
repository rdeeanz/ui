"use client"

import * as React from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { hapusMaster, type ActionResult } from "@/app/actions/master"

export type Field = {
  name: string
  label: string
  type: "text" | "number" | "select"
  options?: { value: string; label: string }[]
  required?: boolean
}
export type Row = { id: string; values: Record<string, string | number | null> }
export type Column = { key: string; label: string }

export function MasterManager({
  title,
  entitas,
  columns,
  rows,
  fields,
  saveAction,
}: {
  title: string
  entitas: "regional" | "pelabuhan" | "kategori"
  columns: Column[]
  rows: Row[]
  fields: Field[]
  saveAction: (input: unknown) => Promise<ActionResult>
}) {
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Row | null>(null)
  const [form, setForm] = React.useState<Record<string, string>>({})
  const [pending, startTransition] = React.useTransition()
  const [hapusTarget, setHapusTarget] = React.useState<Row | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(Object.fromEntries(fields.map((f) => [f.name, ""])))
    setOpen(true)
  }
  function openEdit(row: Row) {
    setEditing(row)
    setForm(Object.fromEntries(fields.map((f) => [f.name, String(row.values[f.name] ?? "")])))
    setOpen(true)
  }

  function submit() {
    startTransition(async () => {
      const res = await saveAction({ ...form, id: editing?.id })
      if (res.ok) {
        toast.success(res.message)
        setOpen(false)
      } else toast.error(res.message)
    })
  }

  function confirmHapus() {
    if (!hapusTarget) return
    startTransition(async () => {
      const res = await hapusMaster(entitas, hapusTarget.id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      setHapusTarget(null)
    })
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Tambah {title}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{row.values[c.key] ?? "-"}</TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      onClick={() => setHapusTarget(row)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-muted-foreground text-center">
                  Belum ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Ubah" : "Tambah"} {title}
            </DialogTitle>
            <DialogDescription>Lengkapi data berikut.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {fields.map((f) => (
              <div key={f.name} className="grid gap-2">
                <Label htmlFor={f.name}>{f.label}</Label>
                {f.type === "select" ? (
                  <Select value={form[f.name] ?? ""} onValueChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}>
                    <SelectTrigger id={f.name}>
                      <SelectValue placeholder={`Pilih ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}
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

      <Dialog open={!!hapusTarget} onOpenChange={(o) => !o && setHapusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus data?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan dan dapat menghapus data terkait.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHapusTarget(null)} disabled={pending}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmHapus} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
