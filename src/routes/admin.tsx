import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { fmtBRL } from "@/lib/cart-store";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [tab, setTab] = useState<"itens" | "categorias" | "avisos">("itens");

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <p className="text-sm text-muted-foreground">Gerencie cardápio, categorias e avisos.</p>

      <div className="mt-4 flex gap-2 rounded-full bg-muted p-1">
        {(["itens", "categorias", "avisos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold capitalize transition ${
              tab === t ? "bg-card text-foreground shadow-card" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "categorias" && <CategoriasAdmin />}
      {tab === "itens" && <ItensAdmin />}
      {tab === "avisos" && <AvisosAdmin />}
    </AppShell>
  );
}

function AvisosAdmin() {
  const [mensagem, setMensagem] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("avisos").select("*").limit(1).maybeSingle();
    if (data) {
      setId(data.id);
      setMensagem(data.mensagem ?? "");
      setAtivo(!!data.ativo);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const salvar = async () => {
    const payload = { mensagem, ativo, updated_at: new Date().toISOString() };
    const { error } = id
      ? await supabase.from("avisos").update(payload).eq("id", id)
      : await supabase.from("avisos").insert(payload);
    if (error) toast.error(error.message);
    else toast.success("Aviso salvo");
  };

  if (loading) return <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">Mensagem para os clientes</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Ex: Seu pedido pode demorar 30 minutos por conta do movimento."
          rows={4}
          className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4" />
        Mostrar este aviso na tela de preparo dos clientes
      </label>
      <button onClick={salvar} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
        Salvar aviso
      </button>
      <p className="text-[11px] text-muted-foreground">
        O aviso aparece para o cliente assim que ele faz o pedido. Desative para esconder.
      </p>
    </div>
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
          <ImageUploader
            value={editing.imagem_url ?? null}
            onChange={(url) => setEditing({ ...editing, imagem_url: url })}
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

function ImageUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("itens-img").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("itens-img").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase text-muted-foreground">Foto do prato</label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {value && <img src={value} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
