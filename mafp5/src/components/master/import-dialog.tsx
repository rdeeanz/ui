"use client"

import * as React from "react"
import { Loader2, Upload } from "lucide-react"
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
import { importExcel } from "@/app/actions/import"

export function ImportDialog() {
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await importExcel(fd)
      if (res.ok) {
        toast.success(
          res.ringkasan
            ? `${res.message} ${res.ringkasan.pelabuhan} pelabuhan, ${res.ringkasan.objek} objek (${res.ringkasan.periode}).`
            : res.message
        )
        setOpen(false)
        formRef.current?.reset()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="size-4" /> Import Excel
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Data dari Excel</DialogTitle>
          <DialogDescription>
            Unggah file berformat sama dengan <code>data-output-regional2.xlsx</code>. Data akan
            dibuat/diperbarui sesuai periode pada file.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="file">File Excel (.xlsx)</Label>
            <Input id="file" name="file" type="file" accept=".xlsx" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Import
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
