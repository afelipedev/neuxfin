-- Lembretes proativos no Telegram
-- - Preferências por usuário em telegram_vinculos (ativos, hora em Brasília, resumo semanal).
-- - telegram_lembretes_enviados: deduplicação (cada aviso é enviado uma vez). Só service_role.
-- - lembretes_secret no Vault: gerado aqui, nunca sai do banco. O pg_cron o envia no header
--   e a rota confere chamando validar_segredo_lembretes() (service_role).
-- - pg_cron chama a rota a cada hora; a rota envia para quem escolheu a hora atual.

alter table public.telegram_vinculos
    add column if not exists lembretes_ativos boolean not null default true,
    add column if not exists lembrete_hora smallint not null default 8,
    add column if not exists resumo_semanal boolean not null default true;

alter table public.telegram_vinculos
    add constraint telegram_vinculos_lembrete_hora_valida check (lembrete_hora between 6 and 22);

grant select (lembretes_ativos, lembrete_hora, resumo_semanal) on public.telegram_vinculos to authenticated;

create or replace function public.salvar_preferencias_telegram(p_ativos boolean, p_hora smallint, p_resumo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'Usuário não autenticado' using errcode = '42501';
    end if;
    if p_hora is null or p_hora < 6 or p_hora > 22 then
        raise exception 'Horário inválido (6 a 22)' using errcode = '22023';
    end if;
    update public.telegram_vinculos
       set lembretes_ativos = coalesce(p_ativos, true),
           lembrete_hora = p_hora,
           resumo_semanal = coalesce(p_resumo, true)
     where usuario_id = (select auth.uid());
end;
$$;

revoke execute on function public.salvar_preferencias_telegram(boolean, smallint, boolean) from public, anon;
grant execute on function public.salvar_preferencias_telegram(boolean, smallint, boolean) to authenticated;

create table if not exists public.telegram_lembretes_enviados (
    usuario_id uuid not null references auth.users(id) on delete cascade,
    chave text not null,
    enviado_em timestamptz not null default now(),
    primary key (usuario_id, chave)
);

create index if not exists telegram_lembretes_enviados_data_idx on public.telegram_lembretes_enviados (enviado_em);

alter table public.telegram_lembretes_enviados enable row level security;
revoke all on public.telegram_lembretes_enviados from anon, authenticated;

-- Segredo gerado dentro do banco (só cria se ainda não existir)
do $$
begin
    if not exists (select 1 from vault.secrets where name = 'lembretes_secret') then
        perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'lembretes_secret', 'Header do pg_cron para /api/telegram/lembretes');
    end if;
end $$;

create or replace function public.validar_segredo_lembretes(p_segredo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_segredo text;
begin
    select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'lembretes_secret';
    return v_segredo is not null and p_segredo is not null
       and extensions.digest(p_segredo, 'sha256') = extensions.digest(v_segredo, 'sha256');
end;
$$;

revoke execute on function public.validar_segredo_lembretes(text) from public, anon, authenticated;
grant execute on function public.validar_segredo_lembretes(text) to service_role;

-- Dispara a rota a cada hora cheia (a rota filtra quem quer receber nesta hora)
create or replace function public.disparar_lembretes_telegram()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_segredo text;
begin
    select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'lembretes_secret';
    return net.http_post(
        url := 'https://neuxfin.vercel.app/api/telegram/lembretes',
        body := '{}'::jsonb,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-lembretes-secret', v_segredo),
        timeout_milliseconds := 15000
    );
end;
$$;

revoke execute on function public.disparar_lembretes_telegram() from public, anon, authenticated;

select cron.schedule('lembretes-telegram', '0 * * * *', 'select public.disparar_lembretes_telegram()');
