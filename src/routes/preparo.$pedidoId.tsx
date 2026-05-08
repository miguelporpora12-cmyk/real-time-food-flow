import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Check, ShoppingBag, Clock, UserRound, Lightbulb, Megaphone, Pencil, Plus, Minus, Trash2, Search } from "lucide-react";
import { CURIOSIDADES } from "@/lib/curiosidades";
import { useStaff } from "@/lib/staff-store";
import { fmtBRL } from "@/lib/cart-store";
import { toast } from "sonner";
import { ensureNotifPermission, notify } from "@/lib/notify";

export const Route = createFileRoute("/preparo/$pedidoId")({
  component: PreparoPage,
});

type Status = "confirmado" | "preparando" | "quase_pronto" | "saiu_entrega" | "entregue";

type ItemRow = {
  id: string;
  pedido_id: string;
  item_id: string | null;
  nome: string;
  preco_unitario: number;
  quantidade: number;
};
type CardapioItem = {
  id: string;
  nome: string;
  preco: number;
  imagem_url: string | null;
  disponivel: boolean;
};

const STEPS: { key: Status; label: string; icon: typeof Check; pct: number }[] = [
  { key: "confirmado", label: "Pedido confirmado", icon: Check, pct: 25 },
  { key: "preparando", label: "Na cozinha", icon: ShoppingBag, pct: 50 },
  { key: "quase_pronto", label: "Quase pronto", icon: Clock, pct: 75 },
  { key: "saiu_entrega", label: "Garçom a caminho", icon: UserRound, pct: 100 },
];

function statusCopy(status: Status, mesa: number | null) {
  const mesaStr = mesa ? `mesa ${mesa}` : "sua mesa";
  switch (status) {
    case "confirmado":
      return { badge: "PEDIDO RECEBIDO", title: "Recebemos seu pedido", sub: "Logo nosso chef vai começar o preparo." };
    case "preparando":
      return { badge: "EM PREPARO", title: "Seu pedido está sendo preparado", sub: "Nosso chef já está trabalhando com muito carinho no seu pedido." };
    case "quase_pronto":
      return { badge: "QUASE PRONTO", title: "Já já está pronto!", sub: "Estamos dando os toques finais no seu prato." };
    case "saiu_entrega":
      return { badge: "GARÇOM A CAMINHO", title: `O garçom está indo até a ${mesaStr}`, sub: "Prepare-se: seu pedido chega em instantes." };
    case "entregue":
      return { badge: "ENTREGUE", title: "Bom apetite!", sub: "Seu pedido foi entregue. Aproveite!" };
  }
}

function PreparoPage() {
  const { pedidoId } = Route.useParams();
  const { isStaff } = useStaff();
  const [status, setStatus] = useState<Status>("confirmado");
  const [mesa, setMesa] = useState<number | null>(null);
  const [autoPct, setAutoPct] = useState(15);
  const [aviso, setAviso] = useState<string | null>(null);
  const [curIdx, setCurIdx] = useState(() => Math.floor(Math.random() * CURIOSIDADES.length));
  const lastStatusRef = useRef<Status | null>(null);

  // Staff edit state
  const [editing, setEditing] = useState(false);
  const [itens, setItens] = useState<ItemRow[]>([]);
  const [cardapio, setCardapio] = useState<CardapioItem[]>([]);
  const [search, setSearch] = useState("");

  const refetchPedido = async () => {
    const { data } = await supabase.from("pedidos").select("status,mesa").eq("id", pedidoId).maybeSingle();
    if (data) {
      const newStatus = data.status as Status;
      setStatus((prev) => {
        if (lastStatusRef.current !== null && lastStatusRef.current !== newStatus && !isStaff) {
          const copy = statusCopy(newStatus, data.mesa);
          notify(copy.title, copy.sub);
          toast.success(copy.title);
        }
        lastStatusRef.current = newStatus;
        return newStatus;
      });
      setMesa(data.mesa);
    }
  };

  const refetchItens = async () => {
    const { data } = await supabase
      .from("pedido_itens")
      .select("*")
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: true });
    if (data) setItens(data as ItemRow[]);
  };

  useEffect(() => {
    if (!isStaff) ensureNotifPermission();
  }, [isStaff]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refetchPedido();
      await refetchItens();
      const { data: av } = await supabase.from("avisos").select("mensagem,ativo").limit(1).maybeSingle();
      if (mounted && av && av.ativo && av.mensagem?.trim()) setAviso(av.mensagem);
    })();

    const channel = supabase
      .channel(`pedido:${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        () => refetchPedido()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_itens", filter: `pedido_id=eq.${pedidoId}` },
        () => refetchItens()
      )
      .subscribe();

    // Polling fallback (caso o realtime falhe)
    const poll = setInterval(() => {
      refetchPedido();
      refetchItens();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // Carregar cardápio quando entrar em modo edição
  useEffect(() => {
    if (!editing || cardapio.length > 0) return;
    (async () => {
      const { data } = await supabase
        .from("itens")
        .select("id, nome, preco, imagem_url, disponivel")
        .eq("disponivel", true)
        .order("nome");
      if (data) setCardapio(data as CardapioItem[]);
    })();
  }, [editing, cardapio.length]);

  // gentle auto-progress while no realtime update
  useEffect(() => {
    const target = STEPS.find((s) => s.key === status)?.pct ?? 25;
    const id = setInterval(() => {
      setAutoPct((p) => (p < target ? Math.min(target, p + 1) : p));
    }, 60);
    return () => clearInterval(id);
  }, [status]);

  // Rotate curiosities every 12s
  useEffect(() => {
    const id = setInterval(() => setCurIdx((i) => (i + 1) % CURIOSIDADES.length), 12000);
    return () => clearInterval(id);
  }, []);

  const computedTotal = useMemo(
    () => itens.reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0),
    [itens]
  );

  const recalcAndSaveTotal = async (rows?: ItemRow[]) => {
    const list = rows ?? itens;
    const total = list.reduce((s, r) => s + Number(r.preco_unitario) * r.quantidade, 0);
    await supabase
      .from("pedidos")
      .update({ total, updated_at: new Date().toISOString() })
      .eq("id", pedidoId);
  };

  const addFromMenu = async (it: CardapioItem) => {
    const existing = itens.find((r) => r.item_id === it.id);
    if (existing) {
      const { error } = await supabase
        .from("pedido_itens")
        .update({ quantidade: existing.quantidade + 1 })
        .eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("pedido_itens").insert({
        pedido_id: pedidoId,
        item_id: it.id,
        nome: it.nome,
        preco_unitario: it.preco,
        quantidade: 1,
      });
      if (error) return toast.error(error.message);
    }
    toast.success(`+ ${it.nome}`);
    await refetchItens();
    await recalcAndSaveTotal();
  };

  const setQty = async (row: ItemRow, q: number) => {
    if (q <= 0) {
      await supabase.from("pedido_itens").delete().eq("id", row.id);
    } else {
      await supabase.from("pedido_itens").update({ quantidade: q }).eq("id", row.id);
    }
    await refetchItens();
    await recalcAndSaveTotal();
  };

  const removeRow = async (row: ItemRow) => {
    await supabase.from("pedido_itens").delete().eq("id", row.id);
    await refetchItens();
    await recalcAndSaveTotal();
  };

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return cardapio;
    return cardapio.filter((i) => i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [cardapio, search]);

  const copy = useMemo(() => statusCopy(status, mesa), [status, mesa]);
  const activeIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const showWaiter = status === "saiu_entrega" || status === "entregue";

  return (
    <AppShell>
      <div className="animate-float-up flex flex-col items-center px-2 py-4 text-center">
        <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-full bg-primary-soft p-4 shadow-soft">
          {showWaiter ? (
            <video
              src="/animations/waiter.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto h-auto w-full [mix-blend-mode:multiply]"
            />
          ) : (
            <video
              src="/animations/chef.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto h-auto w-full [mix-blend-mode:multiply]"
            />
          )}
        </div>

        <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-xs font-bold tracking-wide text-primary">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
          {copy.badge}
        </span>

        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight">{copy.title}</h1>
        <p className="mt-3 max-w-sm text-base text-muted-foreground">{copy.sub}</p>

        {mesa && (
          <p className="mt-2 text-sm text-muted-foreground">
            Mesa <span className="font-bold text-foreground">{mesa}</span>
          </p>
        )}

        {aviso && (
          <div className="mt-5 flex w-full max-w-md items-start gap-3 rounded-2xl border border-primary/30 bg-primary-soft/60 p-3 text-left text-sm">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="font-medium text-foreground">{aviso}</p>
          </div>
        )}

        <div className="mt-8 w-full max-w-md">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${autoPct}%` }}
            />
          </div>
          <ol className="mt-5 grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const done = i <= activeIdx;
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${
                      done ? "border-primary bg-primary-soft text-primary" : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight ${done ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Painel do funcionário: editar pedido */}
        {isStaff && (
          <div className="mt-8 w-full max-w-md text-left">
            <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Itens do pedido</h2>
                <button
                  onClick={() => setEditing((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-soft ${
                    editing ? "border border-border bg-background" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editing ? "Concluir" : "Editar"}
                </button>
              </div>

              <ul className="mt-3 divide-y divide-border/60">
                {itens.map((row) => (
                  <li key={row.id} className="flex items-center gap-2 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{row.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.quantidade} × {fmtBRL(Number(row.preco_unitario))}
                      </p>
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(row, row.quantidade - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-bold">{row.quantidade}</span>
                        <button
                          onClick={() => setQty(row, row.quantidade + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeRow(row)}
                          className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-destructive/10 text-destructive"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 text-sm font-bold">
                        {fmtBRL(Number(row.preco_unitario) * row.quantidade)}
                      </span>
                    )}
                  </li>
                ))}
                {itens.length === 0 && (
                  <li className="py-3 text-center text-xs text-muted-foreground">Sem itens.</li>
                )}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Total {editing ? "(atualizado)" : ""}
                </span>
                <span className="text-2xl font-extrabold text-primary">{fmtBRL(computedTotal)}</span>
              </div>
            </div>

            {editing && (
              <section className="mt-4 rounded-3xl border border-border bg-card p-4 shadow-card">
                <h3 className="text-sm font-bold">Adicionar item do cardápio</h3>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar prato..."
                    className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                  />
                </div>
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {filteredMenu.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5"
                    >
                      {it.imagem_url ? (
                        <img
                          src={it.imagem_url}
                          alt={it.nome}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">{it.nome}</p>
                        <p className="text-xs text-muted-foreground">{fmtBRL(Number(it.preco))}</p>
                      </div>
                      <button
                        onClick={() => addFromMenu(it)}
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"
                        aria-label="Adicionar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  {cardapio.length === 0 && (
                    <li className="text-center text-xs text-muted-foreground">Carregando cardápio...</li>
                  )}
                  {cardapio.length > 0 && filteredMenu.length === 0 && (
                    <li className="text-center text-xs text-muted-foreground">Nada encontrado.</li>
                  )}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* Curiosidades */}
        {!isStaff && (
          <div className="mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-4 text-left shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <Lightbulb className="h-4 w-4" /> Você sabia?
            </div>
            <p key={curIdx} className="mt-2 animate-fade-in text-sm leading-relaxed text-foreground">
              {CURIOSIDADES[curIdx]}
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">Curiosidades enquanto você espera ✨</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
