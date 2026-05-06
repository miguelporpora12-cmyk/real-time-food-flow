import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL, useCart } from "@/lib/cart-store";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: CardapioPage,
});

type Categoria = { id: string; nome: string; ordem: number };
type Item = {
  id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
};

function CardapioPage() {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "all">("all");
  const { add, count, total } = useCart();

  const cats = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const itens = useQuery({
    queryKey: ["itens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens")
        .select("*")
        .eq("disponivel", true)
        .order("nome");
      if (error) throw error;
      return data as Item[];
    },
  });

  const filtered = useMemo(() => {
    const list = itens.data ?? [];
    return list.filter(
      (i) =>
        (catId === "all" || i.categoria_id === catId) &&
        (q === "" || i.nome.toLowerCase().includes(q.toLowerCase()))
    );
  }, [itens.data, catId, q]);

  return (
    <AppShell>
      <header className="animate-float-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Bem-vindo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">O que vamos pedir hoje?</h1>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar prato..."
            className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-4 text-sm shadow-card outline-none focus:border-primary"
          />
        </div>
      </header>

      <div className="mt-5 -mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-2">
          <CatChip active={catId === "all"} onClick={() => setCatId("all")}>Tudo</CatChip>
          {cats.data?.map((c) => (
            <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
              {c.nome}
            </CatChip>
          ))}
        </div>
      </div>

      <section className="mt-4 grid grid-cols-1 gap-3">
        {itens.isLoading && <p className="text-sm text-muted-foreground">Carregando cardápio...</p>}
        {filtered.map((i, idx) => (
          <article
            key={i.id}
            className="animate-float-up flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <Link
              to="/produto/$id"
              params={{ id: i.id }}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.imagem_url && (
                  <img src={i.imagem_url} alt={i.nome} className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{i.nome}</h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">{i.descricao}</p>
                <p className="mt-1 font-bold text-primary">{fmtBRL(Number(i.preco))}</p>
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                add({ id: i.id, nome: i.nome, preco: Number(i.preco), imagem_url: i.imagem_url });
                toast.success(`${i.nome} adicionado`);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform active:scale-90"
              aria-label="Adicionar"
            >
              <Plus className="h-5 w-5" />
            </button>
          </article>
        ))}
        {!itens.isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum prato encontrado.</p>
        )}
      </section>

      {count > 0 && (
        <Link
          to="/carrinho"
          className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft animate-float-up"
        >
          <ShoppingBag className="h-4 w-4" />
          Ver carrinho • {count} {count === 1 ? "item" : "itens"}
          <span className="rounded-full bg-white/20 px-2 py-0.5">{fmtBRL(total)}</span>
        </Link>
      )}
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
