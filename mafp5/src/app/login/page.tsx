"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Anchor, Loader2 } from "lucide-react"

import { loginAction, type LoginState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Masuk
    </Button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {})

  return (
    <div className="bg-muted flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
            <Anchor className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">Monitoring Availability Fasilitas</h1>
          <p className="text-muted-foreground text-sm">PT Pelabuhan Indonesia (Persero)</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Masuk ke akun</CardTitle>
            <CardDescription>Gunakan email dinas dan kata sandi Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@pelindo.co.id"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {state.error && (
                <p className="text-destructive text-sm" role="alert">
                  {state.error}
                </p>
              )}
              <SubmitButton />
            </form>
            <div className="text-muted-foreground mt-4 rounded-md border border-dashed p-3 text-xs">
              <p className="font-medium">Akun demo (kata sandi: password123)</p>
              <ul className="mt-1 space-y-0.5">
                <li>admin@pelindo.co.id — Administrator</li>
                <li>pic@pelindo.co.id — PIC Regional</li>
                <li>petugas@pelindo.co.id — Petugas</li>
                <li>manajemen@pelindo.co.id — Manajemen</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
