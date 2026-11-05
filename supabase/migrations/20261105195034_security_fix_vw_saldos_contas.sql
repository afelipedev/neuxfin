-- vw_saldos_contas era SECURITY DEFINER e legível por anon/authenticated:
-- expunha nome e saldo das contas de todos os usuários. Não é usada pelo app.
alter view public.vw_saldos_contas set (security_invoker = true);
revoke select on public.vw_saldos_contas from anon, authenticated;
