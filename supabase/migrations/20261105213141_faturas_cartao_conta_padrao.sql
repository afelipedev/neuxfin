-- =============================================================================
-- Faturas de cartão de crédito e conta padrão
--
-- Regras:
-- - Compra no cartão = despesa com cartao_id e sem conta_id. Não movimenta saldo.
-- - A fatura é calculada (ciclo pelo dia de fechamento do cartão); só o PAGAMENTO
--   da fatura debita uma conta. O pagamento não é despesa (a compra já é), então
--   não entra nos totais do mês, apenas no saldo da conta.
-- - pagar_fatura(): registra o pagamento e liquida as compras da fatura numa
--   única transação. estornar_fatura() marca o pagamento como estornado e reabre as compras.
-- - contas_bancarias.padrao: conta usada por automações (IA/WhatsApp). No máximo
--   uma por usuário.
-- =============================================================================

alter table public.contas_bancarias add column if not exists padrao boolean not null default false;

create unique index if not exists contas_bancarias_padrao_unica
    on public.contas_bancarias (usuario_id) where padrao;

create table if not exists public.faturas_pagamentos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    cartao_id uuid not null references public.cartoes_credito(id) on delete restrict,
    -- 1º dia do mês de vencimento da fatura (ex.: 2026-12-01 = fatura de dez/2026)
    competencia date not null,
    conta_id uuid not null references public.contas_bancarias(id) on delete restrict,
    valor numeric(15, 2) not null check (valor > 0),
    data_pagamento date not null,
    -- Estorno lógico: o pagamento estornado fica no histórico, mas sai do saldo
    estornado_em timestamptz,
    created_at timestamptz not null default now(),
    constraint faturas_pagamentos_competencia_dia_1 check (extract(day from competencia) = 1)
);

-- Um pagamento ativo por fatura
create unique index if not exists faturas_pagamentos_ativo_unico
    on public.faturas_pagamentos (cartao_id, competencia) where estornado_em is null;

create index if not exists faturas_pagamentos_usuario_idx on public.faturas_pagamentos (usuario_id, data_pagamento);
create index if not exists faturas_pagamentos_conta_idx on public.faturas_pagamentos (conta_id);

alter table public.faturas_pagamentos enable row level security;

create policy "faturas_pagamentos_owner_all" on public.faturas_pagamentos
    for all to authenticated
    using ((select auth.uid()) = usuario_id)
    with check ((select auth.uid()) = usuario_id);

-- Compras liquidadas por um pagamento de fatura
alter table public.transacoes
    add column if not exists fatura_pagamento_id uuid references public.faturas_pagamentos(id) on delete set null;

create index if not exists transacoes_fatura_pagamento_idx
    on public.transacoes (fatura_pagamento_id) where fatura_pagamento_id is not null;

create index if not exists transacoes_cartao_vencimento_idx
    on public.transacoes (cartao_id, data_vencimento) where cartao_id is not null;

create or replace function public.validar_fatura_pagamento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if not exists (select 1 from public.cartoes_credito c where c.id = new.cartao_id and c.usuario_id = new.usuario_id) then
        raise exception 'Cartão de crédito inválido para este usuário' using errcode = '23503';
    end if;
    if not exists (select 1 from public.contas_bancarias c where c.id = new.conta_id and c.usuario_id = new.usuario_id) then
        raise exception 'Conta bancária inválida para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_fatura_pagamento
    before insert or update on public.faturas_pagamentos
    for each row execute function public.validar_fatura_pagamento();

-- Excluir cartão com compras deixaria despesas "soltas" (cartao_id vira NULL)
create or replace function public.bloquear_exclusao_cartao_com_compras()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if exists (select 1 from public.transacoes t where t.cartao_id = old.id) then
        raise exception 'Este cartão possui compras lançadas. Exclua ou mova as compras antes de excluí-lo.'
            using errcode = '23503';
    end if;
    return old;
end;
$$;

create or replace trigger trg_bloquear_exclusao_cartao
    before delete on public.cartoes_credito
    for each row execute function public.bloquear_exclusao_cartao_com_compras();

-- Paga a fatura: valor = soma das compras em aberto informadas (que precisam ser do cartão)
create or replace function public.pagar_fatura(
    p_cartao_id uuid,
    p_competencia date,
    p_conta_id uuid,
    p_data_pagamento date,
    p_transacao_ids uuid[]
)
returns public.faturas_pagamentos
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_total numeric;
    v_qtd integer;
    v_pag public.faturas_pagamentos;
begin
    if p_transacao_ids is null or cardinality(p_transacao_ids) = 0 then
        raise exception 'A fatura não possui compras em aberto' using errcode = '22023';
    end if;

    -- Trava as compras para evitar pagamento em dobro concorrente
    select count(*), coalesce(sum(valor), 0) into v_qtd, v_total
      from (
        select t.valor from public.transacoes t
         where t.id = any(p_transacao_ids)
           and t.cartao_id = p_cartao_id
           and t.status <> 'liquidado'
           and t.tipo_transacao = 'despesa'
         for update
      ) s;

    if v_qtd <> cardinality(p_transacao_ids) then
        raise exception 'Algumas compras desta fatura já foram pagas ou não pertencem ao cartão. Atualize a página.'
            using errcode = '22023';
    end if;

    insert into public.faturas_pagamentos (cartao_id, competencia, conta_id, valor, data_pagamento)
    values (p_cartao_id, date_trunc('month', p_competencia)::date, p_conta_id, v_total, coalesce(p_data_pagamento, current_date))
    returning * into v_pag;

    update public.transacoes
       set status = 'liquidado',
           data_pagamento = v_pag.data_pagamento,
           fatura_pagamento_id = v_pag.id
     where id = any(p_transacao_ids);

    return v_pag;
end;
$$;

-- Estorna o pagamento: compras voltam a ficar em aberto e o débito na conta some
create or replace function public.estornar_fatura(p_pagamento_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
    update public.faturas_pagamentos
       set estornado_em = now()
     where id = p_pagamento_id and estornado_em is null;
    if not found then
        raise exception 'Pagamento de fatura não encontrado' using errcode = 'P0002';
    end if;

    update public.transacoes
       set status = 'pendente',
           data_pagamento = null,
           fatura_pagamento_id = null
     where fatura_pagamento_id = p_pagamento_id;
end;
$$;

revoke execute on function public.pagar_fatura(uuid, date, uuid, date, uuid[]) from public, anon;
grant execute on function public.pagar_fatura(uuid, date, uuid, date, uuid[]) to authenticated;
revoke execute on function public.estornar_fatura(uuid) from public, anon;
grant execute on function public.estornar_fatura(uuid) to authenticated;
