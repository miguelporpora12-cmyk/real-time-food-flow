import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StaffGuard } from "@/components/StaffGuard";

export const Route = createFileRoute("/admin")({
  component: () => (
    <StaffGuard>
      <AdminPage />
    </StaffGuard>
  ),
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

function AdminPage() {
  const [tab, setTab] = useState<"itens" | "categorias">("itens");

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <p className="text-sm text-muted-foreground">Gerencie cardápio e categorias.</p>

      <div className="mt-4 flex gap-2 rounded-full bg-muted p-1">
        {(["itens", "categorias"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-card text-foreground shadow-card" : "text-muted-foreground"
            }`}
          >
            {t === "itens" ? "Itens" : "Categorias"}
          </button>
        ))}
      </div>

      {tab === "categorias" ? <CategoriasAdmin /> : <ItensAdmin />}
    </AppShell>
  );
}

function CategoriasAdmin() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const cats = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const add = async () => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("categorias").insert({ nome, ordem: (cats.data?.length ?? 0) + 1 });
    if (error) toast.error(error.message);
    else {
      setNome("");
      qc.invalidateQueries({ queryKey: ["admin-categorias"] });
      qc.invalidateQueries({ queryKey: ["categorias"] });
    }
  };
  const del = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    await supabase.from("categorias").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-categorias"] });
    qc.invalidateQueries({ queryKey: ["categorias"] });
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nova categoria"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button onClick={add} className="flex items-center gap-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <ul className="space-y-2">
        {cats.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <span className="font-medium">{c.nome}</span>
            <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItensAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const cats = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: async () => {
      const { data } = await supabase.from("categorias").select("*").order("ordem");
      return (data ?? []) as Categoria[];
    },
  });

  const itens = useQuery({
    queryKey: ["admin-itens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itens").select("*").order("nome");
      if (error) throw error;
      return data as Item[];
    },
  });

  const save = async () => {
    if (!editing?.nome || !editing.categoria_id) {
      toast.error("Preencha nome e categoria");
      return;
    }
    const payload = {
      nome: editing.nome,
      descricao: editing.descricao ?? null,
      preco: Number(editing.preco) || 0,
      imagem_url: editing.imagem_url ?? null,
      categoria_id: editing.categoria_id,
      disponivel: editing.disponivel ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("itens").update(payload).eq("id", editing.id)
      : await supabase.from("itens").insert(payload);
    if (error) toast.error(error.message);
    else {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-itens"] });
      qc.invalidateQueries({ queryKey: ["itens"] });
    }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir item?")) return;
    await supabase.from("itens").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-itens"] });
    qc.invalidateQueries({ queryKey: ["itens"] });
  };

  return (
    <div className="mt-5 space-y-3">
      <button
        onClick={() => setEditing({ disponivel: true, preco: 0 })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> Novo item
      </button>

      {editing && (
        <div className="space-y-2 rounded-2xl border border-primary/40 bg-card p-4 shadow-card">
          <input
            placeholder="Nome"
            value={editing.nome ?? ""}
            onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Descrição"
            value={editing.descricao ?? ""}
            onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Preço"
              value={editing.preco ?? ""}
              onChange={(e) => setEditing({ ...editing, preco: parseFloat(e.target.value) })}
              className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={editing.categoria_id ?? ""}
              onChange={(e) => setEditing({ ...editing, categoria_id: e.target.value })}
              className="w-1/2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Categoria...</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="URL da imagem"
            value={editing.imagem_url ?? ""}
            onChange={(e) => setEditing({ ...editing, imagem_url: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">
              Salvar
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {itens.data?.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {i.imagem_url && <img src={i.imagem_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.nome}</p>
              <p className="text-xs text-primary">{fmtBRL(Number(i.preco))}</p>
            </div>
            <button onClick={() => setEditing(i)} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => del(i.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
