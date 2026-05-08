import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StaffGuard } from "@/components/StaffGuard";
import { fmtBRL } from "@/lib/cart-store";
import { Receipt, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/recibo")({
  component: () => (
    <StaffGuard>
      <ReciboListPage />
    </StaffGuard>
  ),
});

type Pedido = { id: string; mesa: number; status: string; total: number; created_at: string };

function ReciboListPage() {
  const navigate = useNavigate();
  const [mesa, setMesa] = useState("");
  const [creating, setCreating] = useState(false);

  const q = useQuery({
    queryKey: ["recibos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("arquivado", false)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data as Pedido[];
    },
  });

  const arquivar = async (e: React.MouseEvent, p: Pedido) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Apagar recibo da mesa ${p.mesa}? Continuará nas métricas.`)) return;
    const { error } = await supabase.from("pedidos").update({ arquivado: true }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Recibo apagado");
  };

  useEffect(() => {
    const ch = supabase
      .channel("recibos-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => q.refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [q]);

  const criarRecibo = async () => {
    const n = parseInt(mesa, 10);
    if (!n || n <= 0) return toast.error("Informe o número da mesa");
    setCreating(true);
    const { data, error } = await supabase
      .from("pedidos")
      .insert({ mesa: n, status: "confirmado", total: 0 })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) return toast.error(error?.message ?? "Erro ao criar");
    toast.success(`Recibo da mesa ${n} criado`);
    setMesa("");
    navigate({ to: "/recibo/$pedidoId", params: { pedidoId: data.id } });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Receipt className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Recibos</h1>
          <p className="text-sm text-muted-foreground">Crie ou edite o recibo da mesa.</p>
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-3 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Novo recibo</p>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            placeholder="Nº da mesa"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={creating}
            onClick={criarRecibo}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Criar
          </button>
        </div>
      </section>

      <ul className="mt-5 space-y-2">
        {q.data?.map((p) => (
          <li key={p.id}>
            <Link
              to="/recibo/$pedidoId"
              params={{ pedidoId: p.id }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mesa</p>
                <p className="text-2xl font-extrabold leading-none text-primary">{p.mesa}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  {p.status}
                </span>
                <p className="mt-1 text-sm font-bold">{fmtBRL(Number(p.total))}</p>
              </div>
              <button
                onClick={(e) => arquivar(e, p)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
                aria-label="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {q.data?.length === 0 && (
          <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sem pedidos.
          </li>
        )}
      </ul>
    </AppShell>
  );
}
