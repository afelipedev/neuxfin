-- =============================================================================
-- Pagamento parcial de fatura (o restante vai para a fatura seguinte)
--
-- - faturas_pagamentos.saldo_restante: quanto ficou sem pagar. Vira o "saldo da
--   fatura anterior" da competência seguinte (calculado no app, não é compra nem despesa).
-- - pagar_fatura(..., p_valor): devido = compras em aberto informadas + saldo_restante
--   do pagamento ativo da competência anterior. p_valor nulo = paga tudo.
--   Continua no máximo um pagamento ativo por fatura.
-- - A versão antiga (5 argumentos) passa a delegar para a nova.
-- - estornar_fatura(): bloqueia estornar um pagamento parcial cujo saldo já foi
--   quitado pelo pagamento da fatura seguinte (estorne aquele primeiro).
-- =============================================================================

alter table public.faturas_pagamentos
    add column if not exists saldo_restante numeric(15, 2) not null default 0;

alter table public.faturas_pagamentos
    add constraint faturas_pagamentos_saldo_restante_nao_negativo check (saldo_restante >= 0);

create or replace function public.pagar_fatura(
    p_cartao_id uuid,
    p_competencia date,
    p_conta_id uuid,
    p_data_pagamento date,
    p_transacao_ids uuid[],
    p_valor numeric
)
returns public.faturas_pagamentos
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_competencia date := date_trunc('month', p_competencia)::date;
    v_ids uuid[] := coalesce(p_transacao_ids, '{}');
    v_total numeric;
    v_qtd integer;
    v_anterior numeric;
    v_devido numeric;
    v_valor numeric;
    v_pag public.faturas_pagamentos;
begin
    -- Trava as compras para evitar pagamento em dobro concorrente
    select count(*), coalesce(sum(valor), 0) into v_qtd, v_total
      from (
        select t.valor from public.transacoes t
         where t.id = any(v_ids)
           and t.cartao_id = p_cartao_id
           and t.status <> 'liquidado'
           and t.tipo_transacao = 'despesa'
         for update
      ) s;

    if v_qtd <> cardinality(v_ids) then
        raise exception 'Algumas compras desta fatura já foram pagas ou não pertencem ao cartão. Atualize a página.'
            using errcode = '22023';
    end if;

    -- Saldo que ficou da fatura anterior (pagamento parcial)
    select coalesce(sum(fp.saldo_restante), 0) into v_anterior
      from public.faturas_pagamentos fp
     where fp.cartao_id = p_cartao_id
       and fp.competencia = (v_competencia - interval '1 month')::date
       and fp.estornado_em is null;

    v_devido := v_total + v_anterior;
    if v_devido <= 0 then
        raise exception 'A fatura não possui valores em aberto' using errcode = '22023';
    end if;

    v_valor := round(coalesce(p_valor, v_devido), 2);
    if v_valor <= 0 or v_valor > v_devido then
        raise exception 'O valor pago deve ser maior que zero e no máximo o total da fatura' using errcode = '22023';
    end if;

    insert into public.faturas_pagamentos (cartao_id, competencia, conta_id, valor, saldo_restante, data_pagamento)
    values (p_cartao_id, v_competencia, p_conta_id, v_valor, v_devido - v_valor, coalesce(p_data_pagamento, current_date))
    returning * into v_pag;

    update public.transacoes
       set status = 'liquidado',
           data_pagamento = v_pag.data_pagamento,
           fatura_pagamento_id = v_pag.id
     where id = any(v_ids);

    return v_pag;
end;
$$;

create or replace function public.pagar_fatura(
    p_cartao_id uuid,
    p_competencia date,
    p_conta_id uuid,
    p_data_pagamento date,
    p_transacao_ids uuid[]
)
returns public.faturas_pagamentos
language sql
security invoker
set search_path = ''
as $$
    select public.pagar_fatura(p_cartao_id, p_competencia, p_conta_id, p_data_pagamento, p_transacao_ids, null::numeric);
$$;

create or replace function public.estornar_fatura(p_pagamento_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_pag public.faturas_pagamentos;
begin
    select * into v_pag from public.faturas_pagamentos
     where id = p_pagamento_id and estornado_em is null
     for update;
    if not found then
        raise exception 'Pagamento de fatura não encontrado' using errcode = 'P0002';
    end if;

    if v_pag.saldo_restante > 0 and exists (
        select 1 from public.faturas_pagamentos fp
         where fp.cartao_id = v_pag.cartao_id
           and fp.competencia = (v_pag.competencia + interval '1 month')::date
           and fp.estornado_em is null
    ) then
        raise exception 'O saldo deste pagamento parcial já foi pago na fatura seguinte. Estorne aquele pagamento primeiro.'
            using errcode = '22023';
    end if;

    update public.faturas_pagamentos set estornado_em = now() where id = p_pagamento_id;

    update public.transacoes
       set status = 'pendente',
           data_pagamento = null,
           fatura_pagamento_id = null
     where fatura_pagamento_id = p_pagamento_id;
end;
$$;

revoke execute on function public.pagar_fatura(uuid, date, uuid, date, uuid[], numeric) from public, anon;
grant execute on function public.pagar_fatura(uuid, date, uuid, date, uuid[], numeric) to authenticated;
