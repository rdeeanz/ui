"use server"

import { redirect } from "next/navigation"

import { authenticate, createSession, destroySession, getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type LoginState = { error?: string }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." }
  }

  const user = await authenticate(email, password)
  if (!user) {
    return { error: "Email atau kata sandi salah." }
  }

  await createSession(user)
  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "LOGIN", entitas: "User", entitasId: user.id },
  })

  redirect("/")
}

export async function logoutAction() {
  const user = await getSession()
  if (user) {
    await prisma.auditLog.create({
      data: { userId: user.id, aksi: "LOGOUT", entitas: "User", entitasId: user.id },
    })
  }
  await destroySession()
  redirect("/login")
}
