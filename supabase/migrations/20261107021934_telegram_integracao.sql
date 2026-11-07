-- =============================================================================
-- Integração com o bot do Telegram
--
-- telegram_vinculos (um por usuário):
-- - O usuário gera um código de uso único (10 min) em Configurações → Telegram e abre
--   t.me/<bot>?start=<código>. O webhook (service_role) troca o código pelo chat_id.
-- - Só o hash do código é guardado. O usuário lê apenas colunas não sensíveis.
-- - Um chat do Telegram pertence a no máximo um usuário (vincular de novo move o chat).
-- - Desvincular limpa chat_id (a linha fica para reaproveitar no próximo vínculo).
--
-- telegram_updates: update_id já recebidos (o Telegram reenvia em caso de falha).
-- Sem policies: só o service_role acessa.
-- =============================================================================

create table if not exists public.telegram_vinculos (
    usuario_id uuid primary key references auth.users(id) on delete cascade,
    chat_id bigint unique,
    telegram_username text,
    codigo_hash text unique,
    codigo_expira_em timestamptz,
    vinculado_em timestamptz,
    created_at timestamptz not null default now()
);

alter table public.telegram_vinculos enable row level security;

create policy "telegram_vinculos_select_own" on public.telegram_vinculos
    for select to authenticated
    using ((select auth.uid()) = usuario_id);

revoke all on public.telegram_vinculos from anon, authenticated;
grant select (usuario_id, telegram_username, codigo_expira_em, vinculado_em) on public.telegram_vinculos to authenticated;

create table if not exists public.telegram_updates (
    update_id bigint primary key,
    recebido_em timestamptz not null default now()
);

alter table public.telegram_updates enable row level security;
revoke all on public.telegram_updates from anon, authenticated;

create index if not exists telegram_updates_recebido_idx on public.telegram_updates (recebido_em);

-- Gera um código de vínculo (substitui o anterior). Retorna o código em claro uma única vez.
create or replace function public.gerar_codigo_telegram()
returns table (codigo text, expira_em timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_bytes bytea := extensions.gen_random_bytes(10);
    v_codigo text := '';
    v_expira timestamptz := now() + interval '10 minutes';
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado' using errcode = '42501';
    end if;

    for i in 0..9 loop
        v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    insert into public.telegram_vinculos (usuario_id, codigo_hash, codigo_expira_em)
    values (v_uid, encode(extensions.digest(v_codigo, 'sha256'), 'hex'), v_expira)
    on conflict (usuario_id) do update
        set codigo_hash = excluded.codigo_hash,
            codigo_expira_em = excluded.codigo_expira_em;

    return query select v_codigo, v_expira;
end;
$$;

-- Desvincula o Telegram do usuário logado
create or replace function public.desvincular_telegram()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.telegram_vinculos
       set chat_id = null, telegram_username = null, vinculado_em = null,
           codigo_hash = null, codigo_expira_em = null
     where usuario_id = (select auth.uid());
end;
$$;

-- Usado pelo webhook (service_role): troca o código pelo chat. Retorna o usuario_id ou null.
create or replace function public.vincular_telegram(p_codigo text, p_chat_id bigint, p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_usuario uuid;
begin
    select usuario_id into v_usuario
      from public.telegram_vinculos
     where codigo_hash = encode(extensions.digest(upper(trim(p_codigo)), 'sha256'), 'hex')
       and codigo_expira_em > now()
     for update;

    if v_usuario is null then
        return null;
    end if;

    -- O chat passa a ser deste usuário
    update public.telegram_vinculos
       set chat_id = null, telegram_username = null, vinculado_em = null
     where chat_id = p_chat_id and usuario_id <> v_usuario;

    update public.telegram_vinculos
       set chat_id = p_chat_id,
           telegram_username = nullif(trim(p_username), ''),
           vinculado_em = now(),
           codigo_hash = null,
           codigo_expira_em = null
     where usuario_id = v_usuario;

    return v_usuario;
end;
$$;

revoke execute on function public.gerar_codigo_telegram() from public, anon;
grant execute on function public.gerar_codigo_telegram() to authenticated;
revoke execute on function public.desvincular_telegram() from public, anon;
grant execute on function public.desvincular_telegram() to authenticated;
revoke execute on function public.vincular_telegram(text, bigint, text) from public, anon, authenticated;
grant execute on function public.vincular_telegram(text, bigint, text) to service_role;
