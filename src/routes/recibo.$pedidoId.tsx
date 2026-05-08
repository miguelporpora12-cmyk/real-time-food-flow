import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StaffGuard } from "@/components/StaffGuard";
import { fmtBRL } from "@/lib/cart-store";
import { ArrowLeft, Printer, Pencil } from "lucide-react";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/recibo/$pedidoId")({
  component: () => (
    <StaffGuard>
      <ReciboDetail />
    </StaffGuard>
  ),
});

type Pedido = {
  id: string;
  mesa: number;
  status: string;
  total: number;
  observacao: string | null;
  created_at: string;
};
type ItemRow = {
  id: string;
  pedido_id: string;
  item_id: string | null;
  nome: string;
  preco_unitario: number;
  quantidade: number;
};

function ReciboDetail() {
  const { pedidoId } = Route.useParams();

  const pedido = useQuery({
    queryKey: ["recibo-pedido", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pedidos").select("*").eq("id", pedidoId).single();
      if (error) throw error;
      return data as Pedido;
    },
  });

  const itens = useQuery({
    queryKey: ["recibo-itens", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_itens")
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`recibo-${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_itens", filter: `pedido_id=eq.${pedidoId}` },
        () => itens.refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        () => pedido.refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pedidoId, itens, pedido]);

  const computedTotal = useMemo(
    () => (itens.data ?? []).reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0),
    [itens.data]
  );

  if (pedido.isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  if (!pedido.data) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
        <Link to="/recibo" className="mt-4 inline-flex text-sm font-semibold text-primary">
          Voltar
        </Link>
      </AppShell>
    );
  }

  const p = pedido.data;

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/recibo"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Recibos
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/preparo/$pedidoId"
            params={{ pedidoId }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar pedido
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </button>
        </div>
      </div>

      <article className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-card">
        <header className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mesa</p>
            <p className="text-4xl font-extrabold text-primary">{p.mesa}</p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {p.status}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(p.created_at).toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-muted-foreground">#{p.id.slice(0, 8)}</p>
          </div>
        </header>

        <ul className="mt-3 divide-y divide-border/60">
          {(itens.data ?? []).map((row) => (
            <li key={row.id} className="flex items-center gap-2 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{row.nome}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.quantidade} × {fmtBRL(Number(row.preco_unitario))}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold">
                {fmtBRL(Number(row.preco_unitario) * row.quantidade)}
              </span>
            </li>
          ))}
          {itens.data?.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">Sem itens neste pedido.</li>
          )}
        </ul>

        {p.observacao && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs italic text-muted-foreground">
            Obs: {p.observacao}
          </p>
        )}

        <footer className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
          <span className="text-2xl font-extrabold text-primary">{fmtBRL(computedTotal)}</span>
        </footer>
      </article>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Para alterar produtos, use <span className="font-semibold">Editar pedido</span>.
      </p>
    </AppShell>
  );
}
