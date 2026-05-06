import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Check, ShoppingBag, Clock, Truck } from "lucide-react";

export const Route = createFileRoute("/preparo/$pedidoId")({
  component: PreparoPage,
});

type Status = "confirmado" | "preparando" | "quase_pronto" | "saiu_entrega" | "entregue";

const STEPS: { key: Status; label: string; icon: typeof Check; pct: number }[] = [
  { key: "confirmado", label: "Pedido confirmado", icon: Check, pct: 25 },
  { key: "preparando", label: "Na cozinha", icon: ShoppingBag, pct: 50 },
  { key: "quase_pronto", label: "Quase pronto", icon: Clock, pct: 75 },
  { key: "saiu_entrega", label: "A caminho", icon: Truck, pct: 100 },
];

const STATUS_COPY: Record<Status, { badge: string; title: string; sub: string }> = {
  confirmado: {
    badge: "PEDIDO RECEBIDO",
    title: "Recebemos seu pedido",
    sub: "Logo nosso chef vai começar o preparo.",
  },
  preparando: {
    badge: "EM PREPARO",
    title: "Seu pedido está sendo preparado",
    sub: "Nosso chef já está trabalhando com muito carinho no seu pedido.",
  },
  quase_pronto: {
    badge: "QUASE PRONTO",
    title: "Já já está pronto!",
    sub: "Estamos dando os toques finais no seu prato.",
  },
  saiu_entrega: {
    badge: "A CAMINHO",
    title: "Saiu para entrega",
    sub: "Seu pedido está indo até a sua mesa.",
  },
  entregue: {
    badge: "ENTREGUE",
    title: "Bom apetite!",
    sub: "Seu pedido foi entregue. Aproveite!",
  },
};

function PreparoPage() {
  const { pedidoId } = Route.useParams();
  const [status, setStatus] = useState<Status>("confirmado");
  const [mesa, setMesa] = useState<number | null>(null);
  const [autoPct, setAutoPct] = useState(15);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("pedidos").select("status,mesa").eq("id", pedidoId).maybeSingle();
      if (mounted && data) {
        setStatus(data.status as Status);
        setMesa(data.mesa);
      }
    };
    load();

    const channel = supabase
      .channel(`pedido:${pedidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${pedidoId}` },
        (payload) => {
          const newStatus = (payload.new as { status: Status }).status;
          setStatus(newStatus);
        }
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

  const copy = STATUS_COPY[status];
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status)
  );

  return (
    <AppShell>
      <div className="animate-float-up flex flex-col items-center px-2 py-4 text-center">
        <div className="relative w-full max-w-[320px]">
          <video
            src="/animations/chef.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="mx-auto h-auto w-full"
          />
          <Sparkle className="absolute left-2 top-6 h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
          <Sparkle className="absolute right-6 top-12 h-2 w-2 animate-pulse-dot rounded-full bg-primary/60" delay="0.4s" />
          <Sparkle className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" delay="0.8s" />
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
                      done
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-muted text-muted-foreground"
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
      </div>
    </AppShell>
  );
}

function Sparkle({ className, delay }: { className?: string; delay?: string }) {
  return <span className={className} style={delay ? { animationDelay: delay } : undefined} />;
}
