import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { useStaff } from "@/lib/staff-store";

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { isStaff, logout } = useStaff();
  const max = wide ? "max-w-7xl" : "max-w-2xl";
  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className={`mx-auto flex ${max} items-center justify-between px-4 py-3`}>
          <Link to="/" className="text-sm font-bold tracking-tight">
            🍽️ Cardápio
          </Link>
          {isStaff ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Funcionário
              <LogOut className="ml-1 h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-label="Login funcionário"
            >
              <LogIn className="h-3.5 w-3.5" /> Funcionário
            </Link>
          )}
        </div>
      </header>
      <div className={`mx-auto ${max} px-4 pt-6`}>{children}</div>
      <BottomNav />
    </div>
  );
}
