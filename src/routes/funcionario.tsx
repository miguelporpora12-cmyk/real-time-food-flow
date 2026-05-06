import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { useEffect } from "react";

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

const NEXT: Record<Status, Status | null> = {
  confirmado: "preparando",
  preparando: "quase_pronto",
  quase_pronto: "saiu_entrega",
  saiu_entrega: "entregue",
  entregue: null,
};

const LABEL: Record<Status, string> = {
  confirmado: "Confirmado",
  preparando: "Na cozinha",
  quase_pronto: "Quase pronto",
  saiu_entrega: "A caminho",
  entregue: "Entregue",
};

function FuncionarioPage() {
  const pedidos = useQuery({
    queryKey: ["kitchen-pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
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

  const advance = async (p: Pedido) => {
    const next = NEXT[p.status];
    if (!next) return;
    await supabase.from("pedidos").update({ status: next, updated_at: new Date().toISOString() }).eq("id", p.id);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Painel da Cozinha</h1>
      <p className="text-sm text-muted-foreground">Atualização em tempo real.</p>

      <div className="mt-5 space-y-4">
        {pedidos.data?.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sem pedidos ativos.
          </p>
        )}
        {pedidos.data?.map((p) => {
          const its = itens.data?.filter((i) => i.pedido_id === p.id) ?? [];
          const ageMin = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000);
          return (
            <article key={p.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mesa</p>
                  <p className="text-5xl font-extrabold leading-none text-primary">{p.mesa}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                    {LABEL[p.status]}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">há {ageMin} min</p>
                </div>
              </header>

              <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                {its.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      <span className="font-bold text-primary">{i.quantidade}x</span> {i.nome}
                    </span>
                    <span className="text-muted-foreground">{fmtBRL(Number(i.preco_unitario) * i.quantidade)}</span>
                  </li>
                ))}
              </ul>

              {p.observacao && (
                <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs italic text-muted-foreground">
                  Obs: {p.observacao}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold">{fmtBRL(Number(p.total))}</span>
                {NEXT[p.status] && (
                  <button
                    onClick={() => advance(p)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft"
                  >
                    Avançar → {LABEL[NEXT[p.status]!]}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
