-- Create cofrinhos table
CREATE TABLE public.cofrinhos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    objetivo NUMERIC(15, 2),
    saldo_atual NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cor TEXT NOT NULL,
    icone TEXT NOT NULL,
    descricao TEXT,
    tipo_liquidez TEXT NOT NULL DEFAULT 'diaria',
    data_prevista TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cofrinho_transacoes table
CREATE TABLE public.cofrinho_transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cofrinho_id UUID NOT NULL REFERENCES public.cofrinhos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('aporte', 'resgate')),
    valor NUMERIC(15, 2) NOT NULL,
    data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cofrinhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofrinho_transacoes ENABLE ROW LEVEL SECURITY;

-- Create policies for cofrinhos
CREATE POLICY "Users can view their own cofrinhos"
    ON public.cofrinhos FOR SELECT
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own cofrinhos"
    ON public.cofrinhos FOR INSERT
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own cofrinhos"
    ON public.cofrinhos FOR UPDATE
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can delete their own cofrinhos"
    ON public.cofrinhos FOR DELETE
    USING (auth.uid() = usuario_id);

-- Create policies for cofrinho_transacoes
CREATE POLICY "Users can view transactions of their own cofrinhos"
    ON public.cofrinho_transacoes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.cofrinhos
        WHERE cofrinhos.id = cofrinho_transacoes.cofrinho_id
        AND cofrinhos.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can insert transactions to their own cofrinhos"
    ON public.cofrinho_transacoes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.cofrinhos
        WHERE cofrinhos.id = cofrinho_transacoes.cofrinho_id
        AND cofrinhos.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can delete transactions of their own cofrinhos"
    ON public.cofrinho_transacoes FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.cofrinhos
        WHERE cofrinhos.id = cofrinho_transacoes.cofrinho_id
        AND cofrinhos.usuario_id = auth.uid()
    ));
