import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { fmtBRL, useCart } from "@/lib/cart-store";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getClienteId } from "@/lib/client-id";

export const Route = createFileRoute("/carrinho")({
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const [mesa, setMesa] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const finalizar = async () => {
    const mesaNum = parseInt(mesa, 10);
    if (!mesaNum || mesaNum < 1) {
      toast.error("Informe o número da mesa");
      return;
    }
    if (items.length === 0) return;
    setEnviando(true);
    try {
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .insert({ mesa: mesaNum, total, status: "confirmado", observacao: obs || null, cliente_id: getClienteId() })
        .select()
        .single();
      if (error || !pedido) throw error;

      const { error: e2 } = await supabase.from("pedido_itens").insert(
        items.map((i) => ({
          pedido_id: pedido.id,
          item_id: i.id,
          nome: i.nome,
          preco_unitario: i.preco,
          quantidade: i.quantidade,
        }))
      );
      if (e2) throw e2;

      clear();
      navigate({ to: "/preparo/$pedidoId", params: { pedidoId: pedido.id } });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar pedido");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Seu carrinho</h1>
      <p className="text-sm text-muted-foreground">Revise os itens antes de confirmar.</p>

      <ul className="mt-5 space-y-3">
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Carrinho vazio. Adicione itens do cardápio.
          </li>
        )}
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {i.imagem_url && <img src={i.imagem_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{i.nome}</h3>
              <p className="text-sm font-bold text-primary">{fmtBRL(i.preco * i.quantidade)}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted p-1">
              <button onClick={() => setQty(i.id, i.quantidade - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-card">
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">{i.quantidade}</span>
              <button onClick={() => setQty(i.id, i.quantidade + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Número da mesa</label>
            <input
              type="number"
              inputMode="numeric"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              placeholder="Ex: 12"
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-semibold outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Observação (opcional)</label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              placeholder="Sem cebola, ponto da carne..."
              className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-primary">{fmtBRL(total)}</span>
          </div>
          <button
            onClick={finalizar}
            disabled={enviando}
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-soft transition-opacity disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Confirmar pedido"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
