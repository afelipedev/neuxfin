-- =============================================================================
-- Ajuste de saldo (conciliação) e orçamento mensal por categoria
--
-- ajustes_saldo:
-- - Corrige o saldo calculado de uma conta para bater com o banco. Não é receita
--   nem despesa: entra só no saldo da conta (como uma transferência), com sinal.
-- - Desfazer = soft delete (removido_em).
--
-- orcamentos:
-- - Limite mensal de despesas por categoria (tipo PF/PJ ou nulo = ambos).
-- - O gasto é calculado no app (competência = data_vencimento), não armazenado.
-- - No máximo um orçamento ativo por categoria e usuário.
-- =============================================================================

create table if not exists public.ajustes_saldo (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    conta_id uuid not null references public.contas_bancarias(id) on delete restrict,
    valor numeric(15, 2) not null check (valor <> 0),
    data date not null default current_date,
    descricao text,
    created_at timestamptz not null default now(),
    removido_em timestamptz
);

create index if not exists ajustes_saldo_conta_data_idx
    on public.ajustes_saldo (conta_id, data) where removido_em is null;
create index if not exists ajustes_saldo_usuario_idx on public.ajustes_saldo (usuario_id);

alter table public.ajustes_saldo enable row level security;

create policy "ajustes_saldo_owner_all" on public.ajustes_saldo
    for all to authenticated
    using ((select auth.uid()) = usuario_id)
    with check ((select auth.uid()) = usuario_id);

create or replace function public.validar_conta_ajuste_saldo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if not exists (select 1 from public.contas_bancarias c where c.id = new.conta_id and c.usuario_id = new.usuario_id) then
        raise exception 'Conta bancária inválida para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_conta_ajuste_saldo
    before insert or update of conta_id, usuario_id on public.ajustes_saldo
    for each row execute function public.validar_conta_ajuste_saldo();

create table if not exists public.orcamentos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    -- Orçamento não faz sentido sem a categoria: some junto com ela
    categoria_id uuid not null references public.categorias(id) on delete cascade,
    valor_mensal numeric(15, 2) not null check (valor_mensal > 0),
    tipo text check (tipo in ('PF', 'PJ')),
    created_at timestamptz not null default now(),
    removido_em timestamptz
);

create unique index if not exists orcamentos_categoria_ativo_unico
    on public.orcamentos (usuario_id, categoria_id) where removido_em is null;
create index if not exists orcamentos_categoria_idx on public.orcamentos (categoria_id);

alter table public.orcamentos enable row level security;

create policy "orcamentos_owner_all" on public.orcamentos
    for all to authenticated
    using ((select auth.uid()) = usuario_id)
    with check ((select auth.uid()) = usuario_id);

create or replace function public.validar_categoria_orcamento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if not exists (
        select 1 from public.categorias c
         where c.id = new.categoria_id
           and (c.usuario_id = new.usuario_id or c.usuario_id is null)
    ) then
        raise exception 'Categoria inválida para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_categoria_orcamento
    before insert or update of categoria_id, usuario_id on public.orcamentos
    for each row execute function public.validar_categoria_orcamento();
