-- =============================================================================
-- Movimentações entre contas e cofrinhos
-- - contas_bancarias.data_saldo_inicial: lançamentos anteriores já estão no saldo inicial
--   (nulo = sem corte).
-- - transferencias: entre duas contas do mesmo usuário (não é receita/despesa).
-- - cofrinho_transacoes.conta_id: aporte debita e resgate credita a conta.
-- - registrar_movimento_cofrinho(): movimento + saldo do cofrinho numa transação,
--   com lock de linha e validação de saldo no resgate.
-- =============================================================================

alter table public.contas_bancarias add column if not exists data_saldo_inicial date;

create table if not exists public.transferencias (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    conta_origem_id uuid not null references public.contas_bancarias(id) on delete restrict,
    conta_destino_id uuid not null references public.contas_bancarias(id) on delete restrict,
    valor numeric(15, 2) not null check (valor > 0),
    data date not null default current_date,
    descricao text,
    created_at timestamptz not null default now(),
    constraint transferencias_contas_distintas check (conta_origem_id <> conta_destino_id)
);

create index if not exists transferencias_usuario_data_idx on public.transferencias (usuario_id, data);
create index if not exists transferencias_origem_idx on public.transferencias (conta_origem_id);
create index if not exists transferencias_destino_idx on public.transferencias (conta_destino_id);

alter table public.transferencias enable row level security;

create policy "transferencias_owner_all" on public.transferencias
    for all to authenticated
    using ((select auth.uid()) = usuario_id)
    with check ((select auth.uid()) = usuario_id);

create or replace function public.validar_contas_transferencia()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if (select count(*) from public.contas_bancarias c
         where c.id in (new.conta_origem_id, new.conta_destino_id)
           and c.usuario_id = new.usuario_id) <> 2 then
        raise exception 'Contas da transferência inválidas para este usuário' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_contas_transferencia
    before insert or update on public.transferencias
    for each row execute function public.validar_contas_transferencia();

alter table public.cofrinho_transacoes
    add column if not exists conta_id uuid references public.contas_bancarias(id) on delete restrict;

alter table public.cofrinho_transacoes
    add constraint cofrinho_transacoes_valor_positivo check (valor > 0);

create index if not exists cofrinho_transacoes_conta_id_idx
    on public.cofrinho_transacoes (conta_id) where conta_id is not null;

create or replace function public.validar_conta_cofrinho_transacao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if new.conta_id is not null and not exists (
        select 1
          from public.contas_bancarias cb
          join public.cofrinhos c on c.usuario_id = cb.usuario_id
         where cb.id = new.conta_id and c.id = new.cofrinho_id
    ) then
        raise exception 'Conta bancária inválida para este cofrinho' using errcode = '23503';
    end if;
    return new;
end;
$$;

create or replace trigger trg_validar_conta_cofrinho_transacao
    before insert or update on public.cofrinho_transacoes
    for each row execute function public.validar_conta_cofrinho_transacao();

create or replace function public.registrar_movimento_cofrinho(
    p_cofrinho_id uuid,
    p_tipo text,
    p_valor numeric,
    p_conta_id uuid default null,
    p_data timestamptz default now()
)
returns public.cofrinho_transacoes
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_saldo numeric;
    v_mov public.cofrinho_transacoes;
begin
    if p_tipo not in ('aporte', 'resgate') then
        raise exception 'Tipo de movimento inválido: %', p_tipo using errcode = '22023';
    end if;
    if p_valor is null or p_valor <= 0 then
        raise exception 'O valor deve ser maior que zero' using errcode = '22023';
    end if;

    select saldo_atual into v_saldo from public.cofrinhos where id = p_cofrinho_id for update;
    if not found then
        raise exception 'Cofrinho não encontrado' using errcode = 'P0002';
    end if;
    if p_tipo = 'resgate' and p_valor > v_saldo then
        raise exception 'Saldo insuficiente no cofrinho' using errcode = '22023';
    end if;

    insert into public.cofrinho_transacoes (cofrinho_id, tipo, valor, data, conta_id)
    values (p_cofrinho_id, p_tipo, p_valor, coalesce(p_data, now()), p_conta_id)
    returning * into v_mov;

    update public.cofrinhos
       set saldo_atual = saldo_atual + case when p_tipo = 'aporte' then p_valor else -p_valor end
     where id = p_cofrinho_id;

    return v_mov;
end;
$$;

revoke execute on function public.registrar_movimento_cofrinho(uuid, text, numeric, uuid, timestamptz) from public, anon;
grant execute on function public.registrar_movimento_cofrinho(uuid, text, numeric, uuid, timestamptz) to authenticated;
