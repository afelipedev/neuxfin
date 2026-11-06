-- Assinaturas: data de início (âncora de anual/trimestral/semanal) e conta de pagamento.
-- Transações: vínculo com a assinatura que as gerou (deduplicação por vencimento)
-- e agrupamento de lançamentos recorrentes criados juntos.

alter table public.assinaturas
    add column if not exists conta_id uuid references public.contas_bancarias (id) on delete set null,
    add column if not exists data_inicio date;

update public.assinaturas
   set data_inicio = coalesce((created_at at time zone 'America/Sao_Paulo')::date, current_date)
 where data_inicio is null;

alter table public.assinaturas
    alter column data_inicio set default current_date,
    alter column data_inicio set not null;

create index if not exists assinaturas_conta_idx on public.assinaturas (conta_id) where conta_id is not null;

alter table public.transacoes
    add column if not exists assinatura_id uuid references public.assinaturas (id) on delete set null,
    add column if not exists recorrencia_id uuid;

-- Vincula as despesas já geradas pelo padrão antigo ("[Assinatura] <nome>"), uma por vencimento
with candidatos as (
    select t.id as transacao_id,
           a.id as assinatura_id,
           -- Duplicadas no mesmo vencimento: vincula a liquidada; as demais seguem como transação comum
           row_number() over (
               partition by a.id, t.data_vencimento
               order by (t.status = 'liquidado') desc, t.created_at, t.id
           ) as rn,
           count(*) over (partition by t.id) as matches
      from public.transacoes t
      join public.assinaturas a
        on a.usuario_id = t.usuario_id
       and t.descricao = '[Assinatura] ' || a.nome
     where t.assinatura_id is null
       and t.tipo_transacao = 'despesa'
)
update public.transacoes t
   set assinatura_id = c.assinatura_id
  from candidatos c
 where c.transacao_id = t.id
   and c.rn = 1
   and c.matches = 1;

-- Uma despesa por assinatura e vencimento (NULLs não conflitam: transações comuns não são afetadas)
create unique index if not exists transacoes_assinatura_vencimento_unica
    on public.transacoes (assinatura_id, data_vencimento);

create index if not exists transacoes_recorrencia_idx
    on public.transacoes (recorrencia_id, data_vencimento) where recorrencia_id is not null;

-- Conta da assinatura deve ser do mesmo usuário
create or replace function public.validar_conta_assinatura()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if new.conta_id is not null and not exists (
        select 1 from public.contas_bancarias c where c.id = new.conta_id and c.usuario_id = new.usuario_id
    ) then
        raise exception 'Conta bancária inválida para esta assinatura' using errcode = '23503';
    end if;
    return new;
end;
$$;

create trigger trg_validar_conta_assinatura
    before insert or update of conta_id, usuario_id on public.assinaturas
    for each row execute function public.validar_conta_assinatura();
