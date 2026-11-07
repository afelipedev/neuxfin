-- Histórico curto da conversa com o bot (contexto para respostas como "qual o valor?" → "50").
-- Só o service_role acessa; o agente usa as mensagens dos últimos 30 minutos.
create table if not exists public.telegram_mensagens (
    id bigint generated always as identity primary key,
    usuario_id uuid not null references auth.users(id) on delete cascade,
    chat_id bigint not null,
    papel text not null check (papel in ('user', 'assistant')),
    conteudo text not null,
    created_at timestamptz not null default now()
);

create index if not exists telegram_mensagens_chat_idx on public.telegram_mensagens (usuario_id, chat_id, created_at desc);

alter table public.telegram_mensagens enable row level security;
revoke all on public.telegram_mensagens from anon, authenticated;
