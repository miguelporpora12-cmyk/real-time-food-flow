-- Avisos table (single row config managed by owner)
CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read avisos" ON public.avisos FOR SELECT USING (true);
CREATE POLICY "public write avisos" ON public.avisos FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.avisos (mensagem, ativo) VALUES ('', false);

-- Storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public) VALUES ('itens-img', 'itens-img', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read itens-img" ON storage.objects FOR SELECT USING (bucket_id = 'itens-img');
CREATE POLICY "public upload itens-img" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'itens-img');
CREATE POLICY "public update itens-img" ON storage.objects FOR UPDATE USING (bucket_id = 'itens-img');
CREATE POLICY "public delete itens-img" ON storage.objects FOR DELETE USING (bucket_id = 'itens-img');