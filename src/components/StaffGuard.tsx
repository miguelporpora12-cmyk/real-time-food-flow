import { Link } from "@tanstack/react-router";
import { AppShell } from "./AppShell";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useStaff } from "@/lib/staff-store";

export function StaffGuard({ children }: { children: ReactNode }) {
  const { isStaff } = useStaff();
  if (!isStaff) {
    return (
      <AppShell>
        <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-xl font-bold">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é exclusiva para funcionários.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Entrar como funcionário
          </Link>
        </div>
      </AppShell>
    );
  }
  return <>{children}</>;
}
