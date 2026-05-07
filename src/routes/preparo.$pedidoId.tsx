import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Check, ShoppingBag, Clock, UserRound, Lightbulb, Megaphone } from "lucide-react";
import { CURIOSIDADES } from "@/lib/curiosidades";
import waiterImg from "@/assets/waiter.png";

export const Route = createFileRoute("/preparo/$pedidoId")({
  component: PreparoPage,
});

type Status = "confirmado" | "preparando" | "quase_pronto" | "saiu_entrega" | "entregue";

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
  const [status, setStatus] = useState<Status>("confirmado");
  const [mesa, setMesa] = useState<number | null>(null);
  const [autoPct, setAutoPct] = useState(15);
  const [aviso, setAviso] = useState<string | null>(null);
  const [curIdx, setCurIdx] = useState(() => Math.floor(Math.random() * CURIOSIDADES.length));

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("pedidos").select("status,mesa").eq("id", pedidoId).maybeSingle();
      if (mounted && data) {
        setStatus(data.status as Status);
        setMesa(data.mesa);
      }
      const { data: av } = await supabase.from("avisos").select("mensagem,ativo").limit(1).maybeSingle();
      if (mounted && av && av.ativo && av.mensagem?.trim()) setAviso(av.mensagem);
    })();

    const channel = supabase
      .channel(`pedido:${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        (payload) => setStatus((payload.new as { status: Status }).status)
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [pedidoId]);

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

  const copy = useMemo(() => statusCopy(status, mesa), [status, mesa]);
  const activeIdx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  const showWaiter = status === "saiu_entrega" || status === "entregue";

  return (
    <AppShell>
      <div className="animate-float-up flex flex-col items-center px-2 py-4 text-center">
        <div className="relative w-full max-w-[320px]">
          {showWaiter ? (
            <img
              src={waiterImg}
              alt="Garçom levando o pedido"
              width={320}
              height={320}
              className="mx-auto h-auto w-full animate-float-up"
            />
          ) : (
            <video
              src="/animations/chef.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="mx-auto h-auto w-full"
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

        {/* Curiosidades */}
        <div className="mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-4 text-left shadow-card">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <Lightbulb className="h-4 w-4" /> Você sabia?
          </div>
          <p key={curIdx} className="mt-2 animate-fade-in text-sm leading-relaxed text-foreground">
            {CURIOSIDADES[curIdx]}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">Curiosidades enquanto você espera ✨</p>
        </div>
      </div>
    </AppShell>
  );
}
