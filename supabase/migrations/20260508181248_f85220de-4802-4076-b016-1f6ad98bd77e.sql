ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_pedidos_arquivado ON public.pedidos(arquivado);