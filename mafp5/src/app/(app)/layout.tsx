import { AppShell } from "@/components/layout/app-shell"
import { requireUser } from "@/lib/rbac"
import { getCurrentPeriode, labelPeriode } from "@/lib/analytics"

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser()
  const periode = await getCurrentPeriode()

  return (
    <AppShell
      nama={user.nama}
      email={user.email}
      role={user.role}
      periodeLabel={periode ? labelPeriode(periode) : undefined}
    >
      {children}
    </AppShell>
  )
}
