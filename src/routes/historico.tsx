import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StaffGuard } from "@/components/StaffGuard";
import { fmtBRL } from "@/lib/cart-store";
import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";

export const Route = createFileRoute("/historico")({
  component: () => (
    <StaffGuard>
      <HistoricoPage />
    </StaffGuard>
  ),
});

type Pedido = { id: string; mesa: number; status: string; total: number; created_at: string };
type Range = "1d" | "3d" | "7d" | "30d";

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "1d", label: "Hoje", days: 1 },
  { key: "3d", label: "3 dias", days: 3 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
];

function HistoricoPage() {
  const [range, setRange] = useState<Range>("7d");
  const days = RANGES.find((r) => r.key === range)!.days;

  const q = useQuery({
    queryKey: ["historico", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pedido[];
    },
  });

  const stats = useMemo(() => {
    const list = q.data ?? [];
    const total = list.reduce((s, p) => s + Number(p.total), 0);
    const entregues = list.filter((p) => p.status === "entregue").length;
    const ticket = list.length ? total / list.length : 0;
    // bucket por dia
    const byDay = new Map<string, { count: number; total: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { count: 0, total: 0 });
    }
    list.forEach((p) => {
      const key = p.created_at.slice(0, 10);
      const cur = byDay.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(p.total);
      byDay.set(key, cur);
    });
    const buckets = Array.from(byDay.entries())
      .map(([d, v]) => ({ d, ...v }))
      .sort((a, b) => a.d.localeCompare(b.d));
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { total, entregues, count: list.length, ticket, buckets, max };
  }, [q.data, days]);

  return (
    <AppShell wide>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Histórico & Métricas</h1>
          <p className="text-sm text-muted-foreground">Resumo dos pedidos por período.</p>
        </div>
        <BarChart3 className="h-6 w-6 text-primary" />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              range === r.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={ShoppingBag} label="Pedidos" value={String(stats.count)} />
        <Stat icon={TrendingUp} label="Entregues" value={String(stats.entregues)} />
        <Stat icon={DollarSign} label="Faturamento" value={fmtBRL(stats.total)} />
        <Stat icon={BarChart3} label="Ticket médio" value={fmtBRL(stats.ticket)} />
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-bold">Pedidos por dia</h2>
        <div className="mt-4 flex h-44 items-end gap-2">
          {stats.buckets.map((b) => (
            <div key={b.d} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end">
                <div
                  className="w-full rounded-t-md bg-primary transition-all"
                  style={{ height: `${(b.count / stats.max) * 100}%`, minHeight: b.count > 0 ? "6px" : "2px" }}
                  title={`${b.count} pedidos — ${fmtBRL(b.total)}`}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">{b.count}</span>
              <span className="text-[9px] text-muted-foreground">{b.d.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold">Últimos pedidos</h2>
        <ul className="mt-3 space-y-2">
          {(q.data ?? []).slice(0, 30).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Mesa <span className="text-foreground">{p.mesa}</span> ·{" "}
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-primary">{p.status}</p>
              </div>
              <span className="text-sm font-bold">{fmtBRL(Number(p.total))}</span>
            </li>
          ))}
          {q.data?.length === 0 && (
            <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Sem pedidos no período.
            </li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}
