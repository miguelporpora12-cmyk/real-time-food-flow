import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { useStaff } from "@/lib/staff-store";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isStaff, logout } = useStaff();
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      toast.success("Acesso liberado");
      navigate({ to: "/funcionario" });
    } else {
      toast.error("Senha incorreta");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto mt-6 max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Acesso Funcionário</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Apenas a equipe pode acessar Cozinha e Admin.
          </p>
        </div>

        {isStaff ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm">Você já está logado como funcionário.</p>
            <button
              onClick={() => {
                logout();
                toast.info("Sessão encerrada");
              }}
              className="mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
            >
              Sair
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Senha
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              Entrar
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
