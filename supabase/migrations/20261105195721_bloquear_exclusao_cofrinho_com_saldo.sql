-- Excluir um cofrinho apaga seus movimentos (ON DELETE CASCADE). Se houver aportes
-- vinculados a contas e saldo no cofrinho, o dinheiro "voltaria" para a conta.
-- Exige resgatar o saldo antes de excluir.
create or replace function public.bloquear_exclusao_cofrinho_com_saldo()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if old.saldo_atual <> 0 and exists (
        select 1 from public.cofrinho_transacoes ct
         where ct.cofrinho_id = old.id and ct.conta_id is not null
    ) then
        raise exception 'Resgate o saldo do cofrinho para uma conta antes de excluí-lo.'
            using errcode = '23503';
    end if;
    return old;
end;
$$;

create or replace trigger trg_bloquear_exclusao_cofrinho
    before delete on public.cofrinhos
    for each row execute function public.bloquear_exclusao_cofrinho_com_saldo();
