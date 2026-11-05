-- =============================================================================
-- Integridade financeira e performance
-- - Normaliza data_pagamento x status (120 pagos sem data; 1 em aberto com data).
-- - Checks: status válido, valor > 0, status x data_pagamento coerentes, parcelas.
--   (transacoes_status_check antigo, mais amplo, permanece; o novo restringe.)
-- - Excluir conta com lançamentos: bloqueado por trigger (o FK é ON DELETE SET NULL
--   e tirava os lançamentos do saldo silenciosamente).
-- - Vínculos conta/cartão/categoria devem ser do mesmo usuário (FK não passa por RLS).
-- - Índices de FKs e das consultas de saldo/listagem.
-- =============================================================================

update public.transacoes set data_pagamento = data_vencimento where status = 'liquidado' and data_pagamento is null;
update public.transacoes set data_pagamento = null where status <> 'liquidado' and data_pagamento is not null;
update public.contas_bancarias set saldo_inicial = 0 where saldo_inicial is null;

alter table public.transacoes
    add constraint transacoes_status_valido check (status in ('liquidado', 'pendente', 'atrasado')),
    add constraint transacoes_valor_positivo check (valor > 0),
    add constraint transacoes_pagamento_coerente check ((status = 'liquidado') = (data_pagamento is not null)),
    add constraint transacoes_parcelas_validas check (total_parcelas is null or (parcela_atual between 1 and total_parcelas));

alter table public.contas_bancarias
    alter column saldo_inicial set default 0,
    alter column saldo_inicial set not null;

create or replace function public.bloquear_exclusao_conta_com_lancamentos()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_qtd integer;
begin
    select count(*) into v_qtd from public.transacoes where conta_id = old.id;
    if v_qtd > 0 then
        raise exception 'A conta possui % lançamento(s) vinculado(s). Mova-os para outra conta antes de excluir.', v_qtd
            using errcode = '23503';
    end if;
    return old;
end;
$$;

create or replace trigger trg_bloquear_exclusao_conta
    before delete on public.contas_bancarias
    for each row execute function public.bloquear_exclusao_conta_com_lancamentos();

create or replace function public.validar_vinculos_transacao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if new.conta_id is not null and not exists (
        select 1 from public.contas_bancarias c where c.id = new.conta_id and c.usuario_id = new.usuario_id
    ) then
        raise exception 'Conta bancária inválida para este usuário' using errcode = '23503';
    end if;
    if new.cartao_id is not null and not exists (
        select 1 from public.cartoes_credito c where c.id = new.cartao_id and c.usuario_id = new.usuario_id
    ) then
        raise exception 'Cartão de crédito inválido para este usuário' using errcode = '23503';
    end if;
    if new.categoria_id is not null and not exists (
        select 1 from public.categorias c where c.id = new.categoria_id and (c.usuario_id = new.usuario_id or c.usuario_id is null)
    ) then
        raise exception 'Categoria inválida para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_vinculos_transacao
    before insert or update of conta_id, cartao_id, categoria_id, usuario_id on public.transacoes
    for each row execute function public.validar_vinculos_transacao();

create index if not exists transacoes_usuario_vencimento_idx on public.transacoes (usuario_id, data_vencimento);
create index if not exists transacoes_conta_id_idx on public.transacoes (conta_id) where conta_id is not null;
create index if not exists transacoes_cartao_id_idx on public.transacoes (cartao_id) where cartao_id is not null;
create index if not exists transacoes_categoria_id_idx on public.transacoes (categoria_id);
create index if not exists transacoes_transacao_pai_id_idx on public.transacoes (transacao_pai_id) where transacao_pai_id is not null;
create index if not exists contas_bancarias_usuario_id_idx on public.contas_bancarias (usuario_id);
create index if not exists cartoes_credito_usuario_id_idx on public.cartoes_credito (usuario_id);
create index if not exists categorias_usuario_id_idx on public.categorias (usuario_id);
create index if not exists assinaturas_usuario_id_idx on public.assinaturas (usuario_id);
create index if not exists assinaturas_cartao_id_idx on public.assinaturas (cartao_id);
create index if not exists assinaturas_categoria_id_idx on public.assinaturas (categoria_id);
create index if not exists cofrinhos_usuario_id_idx on public.cofrinhos (usuario_id);
create index if not exists cofrinho_transacoes_cofrinho_id_idx on public.cofrinho_transacoes (cofrinho_id);
