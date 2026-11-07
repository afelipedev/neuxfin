-- =============================================================================
-- Segurança e isolamento entre usuários
--
-- 1. anon (visitante sem login) não tem privilégio em nenhuma tabela/view de public.
--    A RLS já bloqueava (policies são `to authenticated`); isto é a segunda camada.
--    Default privileges garantem o mesmo para tabelas criadas no futuro.
-- 2. Funções de trigger não são chamáveis via RPC por anon/authenticated.
-- 3. Vínculos entre tabelas são validados por dono: uma FK não passa pela RLS, então
--    sem o trigger seria possível apontar para o id de outro usuário.
--    - assinaturas: conta, cartão e categoria
--    - transacoes: + assinatura, parcela pai e pagamento de fatura
-- =============================================================================

-- 1. anon sem acesso
do $$
declare r record;
begin
    for r in
        select c.relname, c.relkind
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'S')
    loop
        if r.relkind = 'S' then
            execute format('revoke all on sequence public.%I from anon', r.relname);
        else
            execute format('revoke all on table public.%I from anon', r.relname);
        end if;
    end loop;
end $$;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

-- 2. Funções de trigger fora da API
do $$
declare r record;
begin
    for r in
        select p.oid::regprocedure as fn
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
    loop
        execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
    end loop;
end $$;

-- 3a. Assinaturas: conta, cartão e categoria do mesmo usuário
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
    if new.cartao_id is not null and not exists (
        select 1 from public.cartoes_credito c where c.id = new.cartao_id and c.usuario_id = new.usuario_id
    ) then
        raise exception 'Cartão de crédito inválido para esta assinatura' using errcode = '23503';
    end if;
    if new.categoria_id is not null and not exists (
        select 1 from public.categorias c where c.id = new.categoria_id and (c.usuario_id = new.usuario_id or c.usuario_id is null)
    ) then
        raise exception 'Categoria inválida para esta assinatura' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_conta_assinatura
    before insert or update of conta_id, cartao_id, categoria_id, usuario_id on public.assinaturas
    for each row execute function public.validar_conta_assinatura();

-- 3b. Transações: todos os vínculos do mesmo usuário
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
    if new.assinatura_id is not null and not exists (
        select 1 from public.assinaturas a where a.id = new.assinatura_id and a.usuario_id = new.usuario_id
    ) then
        raise exception 'Assinatura inválida para este usuário' using errcode = '23503';
    end if;
    -- A parcela pai pode estar sendo inserida no mesmo comando (parcelamento atômico)
    if new.transacao_pai_id is not null and new.transacao_pai_id <> new.id and not exists (
        select 1 from public.transacoes t where t.id = new.transacao_pai_id and t.usuario_id = new.usuario_id
    ) then
        raise exception 'Parcelamento inválido para este usuário' using errcode = '23503';
    end if;
    if new.fatura_pagamento_id is not null and not exists (
        select 1 from public.faturas_pagamentos f where f.id = new.fatura_pagamento_id and f.usuario_id = new.usuario_id
    ) then
        raise exception 'Pagamento de fatura inválido para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_vinculos_transacao
    before insert or update of conta_id, cartao_id, categoria_id, usuario_id, assinatura_id, transacao_pai_id, fatura_pagamento_id
    on public.transacoes
    for each row execute function public.validar_vinculos_transacao();

revoke execute on function public.validar_conta_assinatura() from public, anon, authenticated;
revoke execute on function public.validar_vinculos_transacao() from public, anon, authenticated;
