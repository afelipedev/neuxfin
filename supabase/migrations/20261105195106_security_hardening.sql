-- =============================================================================
-- Endurecimento de segurança
-- - get_financial_summary: reescrita (lia a view vulnerável e somava errado),
--   search_path fixo e execução apenas para service_role.
-- - Funções SECURITY DEFINER: search_path fixo e sem EXECUTE para anon/authenticated.
-- - Políticas RLS: restritas a authenticated, (select auth.uid()) e WITH CHECK.
-- Obs.: o MCP do Supabase recusa DROP automaticamente; por isso ALTER POLICY.
-- =============================================================================

create or replace function public.get_financial_summary(user_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
    select json_build_object(
        'total_nas_contas', (
            select coalesce(sum(
                cb.saldo_inicial + coalesce((
                    select sum(case when t.tipo_transacao = 'receita' then t.valor else -t.valor end)
                    from public.transacoes t
                    where t.conta_id = cb.id
                      and t.status = 'liquidado'
                      and coalesce(t.data_pagamento, t.data_vencimento) <= current_date
                ), 0)
            ), 0)
            from public.contas_bancarias cb
            where cb.usuario_id = get_financial_summary.user_id
        ),
        'total_limite_cartoes', (select sum(limite) from public.cartoes_credito where usuario_id = get_financial_summary.user_id),
        'primeira_fatura_vincenda', (select min(dia_vencimento) from public.cartoes_credito where usuario_id = get_financial_summary.user_id)
    )
$$;

alter function public.handle_new_user() set search_path = '';
alter function public.insert_default_categories(uuid) set search_path = '';
alter function public.apply_daily_cofrinho_interest() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.insert_default_categories(uuid) from public, anon, authenticated;
revoke execute on function public.apply_daily_cofrinho_interest() from public, anon, authenticated;
revoke execute on function public.get_financial_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_financial_summary(uuid) to service_role;

alter policy "Usuários podem ver suas próprias transações" on public.transacoes
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem ver suas próprias transações" on public.transacoes rename to transacoes_owner_all;

alter policy "Usuários podem gerenciar suas próprias contas" on public.contas_bancarias
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem gerenciar suas próprias contas" on public.contas_bancarias rename to contas_bancarias_owner_all;

alter policy "Usuários podem gerenciar seus próprios cartões" on public.cartoes_credito
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem gerenciar seus próprios cartões" on public.cartoes_credito rename to cartoes_credito_owner_all;

alter policy "Usuários podem ver suas próprias assinaturas" on public.assinaturas
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem ver suas próprias assinaturas" on public.assinaturas rename to assinaturas_owner_all;

alter policy "Usuários podem ver suas próprias categorias" on public.categorias
    to authenticated using (usuario_id is null or (select auth.uid()) = usuario_id);
alter policy "Usuários podem ver suas próprias categorias" on public.categorias rename to categorias_select;
alter policy "Usuários podem criar suas próprias categorias" on public.categorias
    to authenticated with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem criar suas próprias categorias" on public.categorias rename to categorias_insert;
alter policy "Usuários podem atualizar suas próprias categorias" on public.categorias
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Usuários podem atualizar suas próprias categorias" on public.categorias rename to categorias_update;
alter policy "Usuários podem deletar suas próprias categorias" on public.categorias
    to authenticated using ((select auth.uid()) = usuario_id);
alter policy "Usuários podem deletar suas próprias categorias" on public.categorias rename to categorias_remove;

alter policy "Usuários podem ver seu próprio perfil" on public.perfis
    to authenticated using ((select auth.uid()) = id);
alter policy "Usuários podem ver seu próprio perfil" on public.perfis rename to perfis_select;
alter policy "Usuários podem atualizar seu próprio perfil" on public.perfis
    to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "Usuários podem atualizar seu próprio perfil" on public.perfis rename to perfis_update;

alter policy "Users can view their own cofrinhos" on public.cofrinhos
    to authenticated using ((select auth.uid()) = usuario_id);
alter policy "Users can view their own cofrinhos" on public.cofrinhos rename to cofrinhos_select;
alter policy "Users can insert their own cofrinhos" on public.cofrinhos
    to authenticated with check ((select auth.uid()) = usuario_id);
alter policy "Users can insert their own cofrinhos" on public.cofrinhos rename to cofrinhos_insert;
alter policy "Users can update their own cofrinhos" on public.cofrinhos
    to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
alter policy "Users can update their own cofrinhos" on public.cofrinhos rename to cofrinhos_update;
alter policy "Users can delete their own cofrinhos" on public.cofrinhos
    to authenticated using ((select auth.uid()) = usuario_id);
alter policy "Users can delete their own cofrinhos" on public.cofrinhos rename to cofrinhos_remove;

alter policy "Users can view transactions of their own cofrinhos" on public.cofrinho_transacoes
    to authenticated using (exists (select 1 from public.cofrinhos c where c.id = cofrinho_id and c.usuario_id = (select auth.uid())));
alter policy "Users can view transactions of their own cofrinhos" on public.cofrinho_transacoes rename to cofrinho_transacoes_select;
alter policy "Users can insert transactions to their own cofrinhos" on public.cofrinho_transacoes
    to authenticated with check (exists (select 1 from public.cofrinhos c where c.id = cofrinho_id and c.usuario_id = (select auth.uid())));
alter policy "Users can insert transactions to their own cofrinhos" on public.cofrinho_transacoes rename to cofrinho_transacoes_insert;
alter policy "Users can delete transactions of their own cofrinhos" on public.cofrinho_transacoes
    to authenticated using (exists (select 1 from public.cofrinhos c where c.id = cofrinho_id and c.usuario_id = (select auth.uid())));
alter policy "Users can delete transactions of their own cofrinhos" on public.cofrinho_transacoes rename to cofrinho_transacoes_remove;
