-- =============================================================================
-- Suíte de isolamento entre usuários (rodar no SQL Editor ou via MCP execute_sql).
--
-- Cria dois usuários temporários (A e B), popula dados de A e verifica, como B, que:
--   - nenhuma tabela retorna linhas de A;
--   - UPDATE em linhas de A não afeta nada;
--   - não é possível inserir apontando para contas/cartões/categorias/assinaturas/
--     parcelas/faturas de A, nem com usuario_id = A;
--   - as RPCs recusam ids de A;
-- e que o papel anon não lê nenhuma tabela.
--
-- Tudo termina em RAISE EXCEPTION: a transação é desfeita e nada fica gravado.
-- Resultado esperado: "ISOLAMENTO OK (n verificações)". Qualquer falha aparece listada.
-- (DELETE não é testado aqui porque o MCP recusa o comando; as policies de DELETE usam
-- a mesma condição de dono das de UPDATE.)
-- =============================================================================
do $$
declare
    a uuid := gen_random_uuid();
    b uuid := gen_random_uuid();
    a_conta uuid; a_conta2 uuid; a_cartao uuid; a_cat uuid; a_tx uuid; a_compra uuid;
    a_assin uuid; a_cofre uuid; a_pag uuid; b_conta uuid; b_cat uuid;
    n int;
    ok int := 0;
    falhas text[] := '{}';
    t text;
begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data)
    values
        (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', a || '@teste.local', '', now(), now(), now(), '{}', '{}'),
        (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', b || '@teste.local', '', now(), now(), now(), '{}', '{}');

    -- ---------- Dados de A ----------
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.contas_bancarias (usuario_id, nome, tipo, saldo_inicial) values (a, 'A1', 'corrente', 1000) returning id into a_conta;
    insert into public.contas_bancarias (usuario_id, nome, tipo, saldo_inicial) values (a, 'A2', 'corrente', 0) returning id into a_conta2;
    insert into public.cartoes_credito (usuario_id, nome, limite, dia_fechamento, dia_vencimento) values (a, 'CA', 1000, 3, 10) returning id into a_cartao;
    insert into public.categorias (usuario_id, nome, tipo) values (a, 'Cat A', 'despesa') returning id into a_cat;
    insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, data_pagamento, conta_id, categoria_id)
        values (a, 'tx A', 10, 'PF', 'despesa', 'liquidado', current_date, current_date, a_conta, a_cat) returning id into a_tx;
    insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, cartao_id)
        values (a, 'compra A', 50, 'PF', 'despesa', 'pendente', current_date - 40, a_cartao) returning id into a_compra;
    insert into public.assinaturas (usuario_id, nome, valor, status, frequencia, data_inicio) values (a, 'Assin A', 20, 'ativo', 'mensal', current_date) returning id into a_assin;
    insert into public.cofrinhos (usuario_id, nome, saldo_atual, cor, icone) values (a, 'Cofre A', 0, 'azul', 'piggy-bank') returning id into a_cofre;
    perform public.registrar_movimento_cofrinho(a_cofre, 'aporte', 100, a_conta, now());
    insert into public.transferencias (conta_origem_id, conta_destino_id, valor) values (a_conta, a_conta2, 5);
    insert into public.ajustes_saldo (conta_id, valor) values (a_conta, 1);
    insert into public.orcamentos (categoria_id, valor_mensal) values (a_cat, 100);
    select (public.pagar_fatura(a_cartao, date_trunc('month', current_date - 3)::date, a_conta, current_date, array[a_compra], 20)).id into a_pag;

    reset role;

    -- ---------- B tenta ver/alterar A ----------
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    set local role authenticated;

    insert into public.contas_bancarias (usuario_id, nome, tipo, saldo_inicial) values (b, 'B1', 'corrente', 0) returning id into b_conta;
    insert into public.categorias (usuario_id, nome, tipo) values (b, 'Cat B', 'despesa') returning id into b_cat;

    -- Leitura: nenhuma linha de A
    foreach t in array array['contas_bancarias', 'cartoes_credito', 'transacoes', 'assinaturas', 'cofrinhos',
                             'transferencias', 'ajustes_saldo', 'orcamentos', 'faturas_pagamentos', 'perfis']
    loop
        execute format('select count(*) from public.%I where %s = $1', t, case when t = 'perfis' then 'id' else 'usuario_id' end) into n using a;
        if n = 0 then ok := ok + 1; else falhas := falhas || format('SELECT %s viu %s linha(s) de A', t, n); end if;
    end loop;
    select count(*) into n from public.categorias where id = a_cat;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'SELECT categorias viu categoria de A'; end if;
    select count(*) into n from public.cofrinho_transacoes where cofrinho_id = a_cofre;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'SELECT cofrinho_transacoes viu movimento de A'; end if;

    -- UPDATE em linhas de A não afeta nada
    update public.transacoes set valor = 999 where id = a_tx;
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'UPDATE transacoes de A'; end if;
    update public.contas_bancarias set saldo_inicial = 999 where id = a_conta;
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'UPDATE contas de A'; end if;
    update public.cofrinhos set saldo_atual = 999 where id = a_cofre;
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'UPDATE cofrinhos de A'; end if;
    update public.categorias set nome = 'x' where id = a_cat;
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; else falhas := falhas || 'UPDATE categorias de A'; end if;

    -- INSERT apontando para dados de A (cada um deve falhar)
    declare
        tentativas text[] := array[
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, conta_id) values (%L, %L, 1, %L, %L, %L, current_date, %L)', b, 'x', 'PF', 'despesa', 'pendente', a_conta),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, cartao_id) values (%L, %L, 1, %L, %L, %L, current_date, %L)', b, 'x', 'PF', 'despesa', 'pendente', a_cartao),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, categoria_id) values (%L, %L, 1, %L, %L, %L, current_date, %L)', b, 'x', 'PF', 'despesa', 'pendente', a_cat),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, assinatura_id) values (%L, %L, 1, %L, %L, %L, current_date, %L)', b, 'x', 'PF', 'despesa', 'pendente', a_assin),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, transacao_pai_id) values (%L, %L, 1, %L, %L, %L, current_date, %L)', b, 'x', 'PF', 'despesa', 'pendente', a_tx),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento, data_pagamento, fatura_pagamento_id) values (%L, %L, 1, %L, %L, %L, current_date, current_date, %L)', b, 'x', 'PF', 'despesa', 'liquidado', a_pag),
            format('insert into public.transacoes (usuario_id, descricao, valor, tipo, tipo_transacao, status, data_vencimento) values (%L, %L, 1, %L, %L, %L, current_date)', a, 'x', 'PF', 'despesa', 'pendente'),
            format('insert into public.assinaturas (usuario_id, nome, valor, status, frequencia, data_inicio, cartao_id) values (%L, %L, 1, %L, %L, current_date, %L)', b, 'x', 'ativo', 'mensal', a_cartao),
            format('insert into public.assinaturas (usuario_id, nome, valor, status, frequencia, data_inicio, categoria_id) values (%L, %L, 1, %L, %L, current_date, %L)', b, 'x', 'ativo', 'mensal', a_cat),
            format('insert into public.assinaturas (usuario_id, nome, valor, status, frequencia, data_inicio, conta_id) values (%L, %L, 1, %L, %L, current_date, %L)', b, 'x', 'ativo', 'mensal', a_conta),
            format('insert into public.transferencias (conta_origem_id, conta_destino_id, valor) values (%L, %L, 1)', a_conta, b_conta),
            format('insert into public.ajustes_saldo (conta_id, valor) values (%L, 1)', a_conta),
            format('insert into public.orcamentos (categoria_id, valor_mensal) values (%L, 1)', a_cat),
            format('insert into public.cofrinho_transacoes (cofrinho_id, tipo, valor) values (%L, %L, 1)', a_cofre, 'aporte'),
            format('insert into public.faturas_pagamentos (cartao_id, competencia, conta_id, valor, data_pagamento) values (%L, date_trunc(%L, current_date)::date, %L, 1, current_date)', a_cartao, 'month', b_conta),
            format('select public.pagar_fatura(%L, date_trunc(%L, current_date)::date, %L, current_date, %L::uuid[], null)', a_cartao, 'month', b_conta, array[a_compra]),
            format('select public.registrar_movimento_cofrinho(%L, %L, 1, %L, now())', a_cofre, 'aporte', b_conta),
            format('select public.estornar_fatura(%L)', a_pag)
        ];
        sqlx text;
    begin
        foreach sqlx in array tentativas loop
            begin
                execute sqlx;
                falhas := falhas || ('PERMITIU: ' || left(sqlx, 140));
            exception when others then
                ok := ok + 1;
            end;
        end loop;
    end;

    reset role;

    -- ---------- anon não lê nada ----------
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    set local role anon;
    foreach t in array array['contas_bancarias', 'cartoes_credito', 'transacoes', 'assinaturas', 'cofrinhos', 'categorias',
                             'transferencias', 'ajustes_saldo', 'orcamentos', 'faturas_pagamentos', 'perfis', 'modelos_ia',
                             'telegram_vinculos', 'telegram_mensagens', 'telegram_updates', 'telegram_lembretes_enviados', 'cofrinho_transacoes', 'vw_saldos_contas']
    loop
        begin
            execute format('select count(*) from public.%I', t) into n;
            falhas := falhas || format('anon leu %s (%s linhas)', t, n);
        exception when insufficient_privilege then
            ok := ok + 1;
        end;
    end loop;
    reset role;

    if cardinality(falhas) = 0 then
        raise exception 'ISOLAMENTO OK (% verificações)', ok;
    else
        raise exception 'FALHAS DE ISOLAMENTO (% ok): %', ok, array_to_string(falhas, ' | ');
    end if;
end $$;
