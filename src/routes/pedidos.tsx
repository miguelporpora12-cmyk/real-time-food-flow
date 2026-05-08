import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { getClienteId } from "@/lib/client-id";
import { useStaff } from "@/lib/staff-store";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({
  component: PedidosPage,
});

type Pedido = { id: string; mesa: number; status: string; total: number; created_at: string };

function PedidosPage() {
  const clienteId = useMemo(() => getClienteId(), []);
  const { isStaff } = useStaff();

  const q = useQuery({
    queryKey: ["pedidos-list", isStaff ? "all" : clienteId],
    queryFn: async () => {
      let query = supabase
        .from("pedidos")
        .select("*")
        .eq("arquivado", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!isStaff) query = query.eq("cliente_id", clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Pedido[];
    },
  });

  const refetchRef = useRef(q.refetch);
  refetchRef.current = q.refetch;
  useEffect(() => {
    const ch = supabase
      .channel("pedidos-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => refetchRef.current())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const arquivar = async (e: React.MouseEvent, p: Pedido) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Apagar pedido da mesa ${p.mesa}? Continuará nas métricas.`)) return;
    const { error } = await supabase.from("pedidos").update({ arquivado: true }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido apagado");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">{isStaff ? "Todos os pedidos" : "Meus pedidos"}</h1>
      <p className="text-sm text-muted-foreground">
        {isStaff ? "Visão completa de todos os pedidos." : "Apenas seus pedidos aparecem aqui."}
      </p>
      <ul className="mt-5 space-y-3">
        {q.data?.map((p) => (
          <li key={p.id} className="relative">
            <Link
              to="/preparo/$pedidoId"
              params={{ pedidoId: p.id }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div>
                <p className="text-xs font-semibold uppercase text-primary">{p.status.replace("_", " ")}</p>
                <p className="font-bold">Mesa {p.mesa}</p>
                <p className="text-sm text-muted-foreground">{fmtBRL(Number(p.total))}</p>
              </div>
              <div className="flex items-center gap-2">
                {isStaff && (
                  <button
                    onClick={(e) => arquivar(e, p)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-destructive/10 text-destructive"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </li>
        ))}
        {q.data?.length === 0 && (
          <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isStaff ? "Sem pedidos ativos." : "Você ainda não fez nenhum pedido."}
          </li>
        )}
      </ul>
    </AppShell>
  );
}
