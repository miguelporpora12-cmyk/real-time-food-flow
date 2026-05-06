import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/pedidos")({
  component: PedidosPage,
});

type Pedido = { id: string; mesa: number; status: string; total: number; created_at: string };

function PedidosPage() {
  const q = useQuery({
    queryKey: ["pedidos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Pedido[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("pedidos-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => q.refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [q]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Pedidos recentes</h1>
      <ul className="mt-5 space-y-3">
        {q.data?.map((p) => (
          <li key={p.id}>
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
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {q.data?.length === 0 && (
          <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum pedido ainda.
          </li>
        )}
      </ul>
    </AppShell>
  );
}
