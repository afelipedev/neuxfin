-- =============================================================================
-- Rotina diária de limpeza (pg_cron). APLICADA MANUALMENTE no SQL Editor do Supabase:
-- a ferramenta de migrations usada no desenvolvimento recusa comandos DELETE.
--
-- Retenção:
-- - telegram_updates: 3 dias. Só serve para não processar duas vezes um update que o
--   Telegram reenvia (ele tenta por até 24h).
-- - telegram_mensagens: 7 dias. O agente só usa os últimos 30 minutos como contexto.
-- - telegram_vinculos: códigos de vínculo expirados são apagados (hash e expiração).
-- - telegram_lembretes_enviados (Fase 7C): 90 dias (deduplicação dos avisos).
--
-- Roda todo dia às 06:15 UTC (03:15 em Brasília), fora do horário de uso.
-- É idempotente: pode ser executada à mão (select public.limpeza_rotina();).
-- =============================================================================

create or replace function public.limpeza_rotina()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_updates int;
    v_mensagens int;
    v_codigos int;
    v_lembretes int := 0;
begin
    delete from public.telegram_updates where recebido_em < now() - interval '3 days';
    get diagnostics v_updates = row_count;

    delete from public.telegram_mensagens where created_at < now() - interval '7 days';
    get diagnostics v_mensagens = row_count;

    update public.telegram_vinculos
       set codigo_hash = null, codigo_expira_em = null
     where codigo_expira_em is not null and codigo_expira_em < now();
    get diagnostics v_codigos = row_count;

    if to_regclass('public.telegram_lembretes_enviados') is not null then
        execute 'delete from public.telegram_lembretes_enviados where enviado_em < now() - interval ''90 days''';
        get diagnostics v_lembretes = row_count;
    end if;

    return jsonb_build_object(
        'telegram_updates', v_updates,
        'telegram_mensagens', v_mensagens,
        'codigos_expirados', v_codigos,
        'lembretes_enviados', v_lembretes,
        'executado_em', now()
    );
end;
$$;

revoke execute on function public.limpeza_rotina() from public, anon, authenticated;

-- Reagenda sem duplicar (cron.schedule com o mesmo nome substitui o job)
select cron.schedule('limpeza-diaria', '15 6 * * *', 'select public.limpeza_rotina()');
