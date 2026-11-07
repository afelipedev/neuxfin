-- Encerramento da assinatura: depois de data_fim não há mais cobranças (nem despesas geradas).
-- Nulo = sem data para acabar. Canceladas existentes ficam com data_fim nula (o status já impede cobranças).
alter table public.assinaturas add column if not exists data_fim date;

alter table public.assinaturas
    add constraint assinaturas_data_fim_apos_inicio check (data_fim is null or data_fim >= data_inicio);
