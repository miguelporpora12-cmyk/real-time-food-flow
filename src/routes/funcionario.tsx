import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BellRing, Trash2 } from "lucide-react";
import { ensureNotifPermission, notify } from "@/lib/notify";

import { StaffGuard } from "@/components/StaffGuard";

export const Route = createFileRoute("/funcionario")({
  component: () => (
    <StaffGuard>
      <FuncionarioPage />
    </StaffGuard>
  ),
});

type Status = "confirmado" | "preparando" | "quase_pronto" | "saiu_entrega" | "entregue";
type Pedido = { id: string; mesa: number; status: Status; total: number; created_at: string; observacao: string | null };
type ItemRow = { id: string; pedido_id: string; nome: string; quantidade: number; preco_unitario: number };

const STATUS_OPTIONS: { key: Status; label: string }[] = [
  { key: "confirmado", label: "Pedido confirmado" },
  { key: "preparando", label: "Na cozinha" },
  { key: "quase_pronto", label: "Quase pronto" },
  { key: "saiu_entrega", label: "Garçom a caminho" },
];

const LABEL: Record<Status, string> = {
  confirmado: "Confirmado",
  preparando: "Na cozinha",
  quase_pronto: "Quase pronto",
  saiu_entrega: "Garçom a caminho",
  entregue: "Entregue",
};

function formatElapsed(createdAt: string, now: number) {
  const diffSec = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const totalMin = Math.floor(diffSec / 60);
  if (totalMin < 60) {
    const m = totalMin;
    const s = diffSec % 60;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function FuncionarioPage() {
  const [now, setNow] = useState(() => Date.now());
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const pedidos = useQuery({
    queryKey: ["kitchen-pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("arquivado", false)
        .neq("status", "entregue")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Pedido[];
    },
  });

  const itens = useQuery({
    queryKey: ["kitchen-itens", pedidos.data?.map((p) => p.id).join(",")],
    enabled: !!pedidos.data && pedidos.data.length > 0,
    queryFn: async () => {
      const ids = pedidos.data!.map((p) => p.id);
      const { data, error } = await supabase.from("pedido_itens").select("*").in("pedido_id", ids);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  // Tick every second for live timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pedir permissão para notificações ao montar
  useEffect(() => {
    ensureNotifPermission();
  }, []);

  // Detect new orders → notify
  useEffect(() => {
    if (!pedidos.data) return;
    if (!initializedRef.current) {
      pedidos.data.forEach((p) => seenRef.current.add(p.id));
      initializedRef.current = true;
      return;
    }
    pedidos.data.forEach((p) => {
      if (!seenRef.current.has(p.id)) {
        seenRef.current.add(p.id);
        toast.success(`🔔 Pedido novo — Mesa ${p.mesa}`, { duration: 6000 });
        notify("Novo pedido", `Mesa ${p.mesa} — ${fmtBRL(Number(p.total))}`);
      }
    });
  }, [pedidos.data]);

  useEffect(() => {
    const ch = supabase
      .channel("kitchen")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => pedidos.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "pedido_itens" }, () => itens.refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pedidos, itens]);

  const setStatus = async (p: Pedido, s: Status) => {
    if (p.status === s) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ status: s, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) toast.error(error.message);
  };

  const arquivar = async (p: Pedido) => {
    if (!confirm(`Apagar pedido da mesa ${p.mesa}? Ele continuará nas métricas.`)) return;
    const { error } = await supabase.from("pedidos").update({ arquivado: true }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido apagado");
  };

  return (
    <AppShell wide>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel da Cozinha</h1>
          <p className="text-sm text-muted-foreground">Atualização em tempo real.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          <BellRing className="h-3.5 w-3.5" /> {pedidos.data?.length ?? 0} ativos
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {pedidos.data?.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sem pedidos ativos.
          </p>
        )}
        {pedidos.data?.map((p) => {
          const its = itens.data?.filter((i) => i.pedido_id === p.id) ?? [];
          const elapsed = formatElapsed(p.created_at, now);
          return (
            <article key={p.id} className="rounded-3xl border border-border bg-card p-4 shadow-card">
              <header className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mesa</p>
                  <p className="text-4xl font-extrabold leading-none text-primary">{p.mesa}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                    {LABEL[p.status]}
                  </span>
                  <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-foreground">{elapsed}</p>
                </div>
              </header>

              <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
                {its.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      <span className="font-bold text-primary">{i.quantidade}x</span> {i.nome}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{fmtBRL(Number(i.preco_unitario) * i.quantidade)}</span>
                  </li>
                ))}
              </ul>

              {p.observacao && (
                <p className="mt-2 rounded-lg bg-muted px-2 py-1.5 text-[11px] italic text-muted-foreground">
                  Obs: {p.observacao}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{fmtBRL(Number(p.total))}</span>
                <button
                  onClick={() => arquivar(p)}
                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive"
                  aria-label="Apagar pedido"
                >
                  <Trash2 className="h-3 w-3" /> Apagar
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = p.status === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setStatus(p, opt.key)}
                      className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "border border-border bg-background text-foreground hover:border-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
