
-- Status enum for pedidos
CREATE TYPE pedido_status AS ENUM ('confirmado', 'preparando', 'quase_pronto', 'saiu_entrega', 'entregue');

CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa INT NOT NULL,
  status pedido_status NOT NULL DEFAULT 'confirmado',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.itens(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS - public restaurant system
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read categorias" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "public write categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read itens" ON public.itens FOR SELECT USING (true);
CREATE POLICY "public write itens" ON public.itens FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "public write pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read pedido_itens" ON public.pedido_itens FOR SELECT USING (true);
CREATE POLICY "public write pedido_itens" ON public.pedido_itens FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.pedido_itens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_itens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens;

-- Seed
INSERT INTO public.categorias (nome, ordem) VALUES
  ('Entradas', 1),
  ('Pratos Principais', 2),
  ('Bebidas', 3),
  ('Sobremesas', 4);

INSERT INTO public.itens (categoria_id, nome, descricao, preco, imagem_url) VALUES
  ((SELECT id FROM public.categorias WHERE nome='Entradas'), 'Bruschetta', 'Pão italiano com tomate, manjericão e azeite', 24.90, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Entradas'), 'Carpaccio', 'Finas fatias de carne com molho mostarda', 38.50, 'https://images.unsplash.com/photo-1625944525533-473f1b3d9684?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Pratos Principais'), 'Risoto de Funghi', 'Arroz arbóreo com cogumelos frescos', 58.90, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Pratos Principais'), 'Filé Mignon', 'Filé com molho madeira e batatas rústicas', 89.90, 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Pratos Principais'), 'Salmão Grelhado', 'Salmão com legumes salteados', 78.00, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Bebidas'), 'Suco Natural', 'Laranja, abacaxi ou limão', 12.00, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Bebidas'), 'Refrigerante', 'Lata 350ml', 8.00, 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Sobremesas'), 'Petit Gâteau', 'Bolo quente com sorvete de baunilha', 28.00, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600'),
  ((SELECT id FROM public.categorias WHERE nome='Sobremesas'), 'Cheesecake', 'Com calda de frutas vermelhas', 24.00, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600');
