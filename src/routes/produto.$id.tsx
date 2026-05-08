import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL, useCart } from "@/lib/cart-store";
import { ArrowLeft, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/produto/$id")({
  component: ProdutoPage,
});

type Item = {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
};

function ProdutoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const item = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("itens").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Item | null;
    },
  });

  const handleAdd = () => {
    if (!item.data) return;
    for (let i = 0; i < qty; i++) {
      add({ id: item.data.id, nome: item.data.nome, preco: Number(item.data.preco), imagem_url: item.data.imagem_url });
    }
    toast.success(`${qty}x ${item.data.nome} adicionado`);
    navigate({ to: "/" });
  };

  if (item.isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }
  if (!item.data) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Produto não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Voltar ao cardápio
        </Link>
      </AppShell>
    );
  }

  const i = item.data;

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="overflow-hidden rounded-3xl bg-muted">
        <div className="aspect-square w-full">
          {i.imagem_url ? (
            <img src={i.imagem_url} alt={i.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">Sem imagem</div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-tight">{i.nome}</h1>
        <p className="mt-2 text-2xl font-extrabold text-primary">{fmtBRL(Number(i.preco))}</p>
        {i.descricao && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.descricao}</p>}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card p-3">
        <span className="text-sm font-semibold">Quantidade</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
            aria-label="Diminuir"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center font-bold">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Aumentar"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={!i.disponivel}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-50"
      >
        <ShoppingBag className="h-4 w-4" />
        {i.disponivel ? `Adicionar ao carrinho • ${fmtBRL(Number(i.preco) * qty)}` : "Indisponível"}
      </button>
    </AppShell>
  );
}
