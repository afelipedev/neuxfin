-- Modelos de IA (LLM) por usuário, com a API key guardada no Supabase Vault.
-- O cliente só lê metadados (nunca a chave). Escrita apenas pelas RPCs.
-- A chave é lida somente pelo servidor (service_role) via obter_modelo_ia.

create table public.modelos_ia (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    nome text not null check (length(btrim(nome)) between 1 and 60),
    provedor text not null check (provedor in ('groq', 'openai')),
    modelo text not null check (length(btrim(modelo)) between 1 and 120),
    chave_secret_id uuid not null,
    chave_final text not null,
    usar_chat boolean not null default false,
    usar_analise boolean not null default false,
    removido_em timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index modelos_ia_usuario_idx on public.modelos_ia (usuario_id) where removido_em is null;
-- No máximo um modelo ativo por uso (chat / análise) por usuário
create unique index modelos_ia_chat_unico on public.modelos_ia (usuario_id) where usar_chat and removido_em is null;
create unique index modelos_ia_analise_unico on public.modelos_ia (usuario_id) where usar_analise and removido_em is null;

alter table public.modelos_ia enable row level security;

create policy modelos_ia_owner_select on public.modelos_ia
    for select to authenticated
    using (usuario_id = (select auth.uid()) and removido_em is null);

-- Sem escrita direta; leitura apenas das colunas sem segredo
revoke all on public.modelos_ia from anon, authenticated;
grant select (id, nome, provedor, modelo, chave_final, usar_chat, usar_analise, created_at, updated_at)
    on public.modelos_ia to authenticated;

-- Cria ou atualiza um modelo. p_api_key vazio na edição mantém a chave atual.
create or replace function public.salvar_modelo_ia(
    p_id uuid,
    p_nome text,
    p_provedor text,
    p_modelo text,
    p_api_key text,
    p_usar_chat boolean,
    p_usar_analise boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_id uuid;
    v_secret uuid;
    v_key text := nullif(btrim(coalesce(p_api_key, '')), '');
begin
    if v_uid is null then
        raise exception 'Não autenticado' using errcode = '42501';
    end if;
    if p_provedor not in ('groq', 'openai') then
        raise exception 'Provedor inválido' using errcode = '22023';
    end if;
    if v_key is not null and length(v_key) < 10 then
        raise exception 'API key inválida' using errcode = '22023';
    end if;

    -- Libera o uso marcado em outros modelos do usuário
    if p_usar_chat then
        update public.modelos_ia set usar_chat = false, updated_at = now()
         where usuario_id = v_uid and usar_chat and removido_em is null and id is distinct from p_id;
    end if;
    if p_usar_analise then
        update public.modelos_ia set usar_analise = false, updated_at = now()
         where usuario_id = v_uid and usar_analise and removido_em is null and id is distinct from p_id;
    end if;

    if p_id is null then
        if v_key is null then
            raise exception 'Informe a API key' using errcode = '22023';
        end if;
        v_id := gen_random_uuid();
        v_secret := vault.create_secret(v_key, 'modelo_ia:' || v_id::text, 'API key de modelo de IA');
        insert into public.modelos_ia (id, usuario_id, nome, provedor, modelo, chave_secret_id, chave_final, usar_chat, usar_analise)
        values (v_id, v_uid, btrim(p_nome), p_provedor, btrim(p_modelo), v_secret, right(v_key, 4), p_usar_chat, p_usar_analise);
        return v_id;
    end if;

    select chave_secret_id into v_secret
      from public.modelos_ia
     where id = p_id and usuario_id = v_uid and removido_em is null
       for update;
    if not found then
        raise exception 'Modelo não encontrado' using errcode = 'P0002';
    end if;

    if v_key is not null then
        perform vault.update_secret(v_secret, v_key);
    end if;

    update public.modelos_ia
       set nome = btrim(p_nome),
           provedor = p_provedor,
           modelo = btrim(p_modelo),
           chave_final = case when v_key is not null then right(v_key, 4) else chave_final end,
           usar_chat = p_usar_chat,
           usar_analise = p_usar_analise,
           updated_at = now()
     where id = p_id;
    return p_id;
end;
$$;

-- Remoção lógica: apaga o conteúdo da chave no Vault e marca removido_em
create or replace function public.remover_modelo_ia(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_secret uuid;
begin
    select chave_secret_id into v_secret
      from public.modelos_ia
     where id = p_id and usuario_id = auth.uid() and removido_em is null
       for update;
    if not found then
        raise exception 'Modelo não encontrado' using errcode = 'P0002';
    end if;

    perform vault.update_secret(v_secret, 'removido');
    update public.modelos_ia
       set removido_em = now(), usar_chat = false, usar_analise = false, updated_at = now()
     where id = p_id;
end;
$$;

-- Somente servidor: devolve provedor, modelo e chave do uso (chat/analise) ou de um modelo específico
create or replace function public.obter_modelo_ia(p_usuario_id uuid, p_uso text default null, p_modelo_id uuid default null)
returns table (id uuid, provedor text, modelo text, api_key text)
language sql
stable
security definer
set search_path = ''
as $$
    select m.id, m.provedor, m.modelo, s.decrypted_secret
      from public.modelos_ia m
      join vault.decrypted_secrets s on s.id = m.chave_secret_id
     where m.usuario_id = p_usuario_id
       and m.removido_em is null
       and (
            (p_modelo_id is not null and m.id = p_modelo_id)
         or (p_modelo_id is null and p_uso = 'chat' and m.usar_chat)
         or (p_modelo_id is null and p_uso = 'analise' and m.usar_analise)
       )
     limit 1;
$$;

revoke all on function public.salvar_modelo_ia(uuid, text, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.remover_modelo_ia(uuid) from public, anon;
revoke all on function public.obter_modelo_ia(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.salvar_modelo_ia(uuid, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.remover_modelo_ia(uuid) to authenticated;
grant execute on function public.obter_modelo_ia(uuid, text, uuid) to service_role;
