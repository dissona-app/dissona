-- ============================================================================
-- Testes da migration 0007 · Claves
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- Cobre dois itens do gate da R2: "compra de Claves credita uma única vez sob
-- webhook duplicado" e o saldo derivado do ledger.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';
insert into perfil_artista (perfil_id) select id from ator where papel = 'vizinho';

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'prata', 'prata_aprovado', now(), 8 from ator where papel = 'curador';

insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

-- Os pacotes do protótipo da R2 (resolve open-questions #4). O "Catálogo"
-- inativo é o que torna demonstrável a nota "só os ativos aparecem na Carteira".
insert into pacote_clave (nome, quantidade_claves, valor_centavos, desconto_percentual, ativo) values
  ('T Ensaio',     10,  10000, 0,  true),
  ('T Repertorio', 30,  28500, 5,  true),
  ('T Turne',      60,  54000, 10, true),
  ('T Catalogo',  100,  85000, 15, false);

-- ------------------------------------------------------------------- checks

select pg_temp.afirmar_bloqueado(
  'insert into pacote_clave (nome, quantidade_claves, valor_centavos) values ('''', 10, 1000)',
  'pacote sem nome e recusado'
);

select pg_temp.afirmar_bloqueado(
  'insert into pacote_clave (nome, quantidade_claves, valor_centavos, desconto_percentual)
     values (''Invalido'', 10, 1000, 120)',
  'desconto acima de 100% e recusado'
);

-- O preço por Clave é derivado, não coluna: a conta bate com o que a tela mostra.
select pg_temp.afirmar(
  (select round(valor_centavos / quantidade_claves) from pacote_clave where nome = 'T Repertorio') = 950,
  'o preco por Clave do Repertorio e R$ 9,50 — derivado, nao armazenado'
);

-- ---------------------------------------------------- sinal do ledger ------

select pg_temp.afirmar_bloqueado(
  format('insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
          values (%L, ''consumo'', 5, ''consumo positivo'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'consumo com sinal positivo e recusado — creditaria em vez de debitar'
);

select pg_temp.afirmar_bloqueado(
  format('insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
          values (%L, ''compra'', -5, ''compra negativa'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'compra com sinal negativo e recusada'
);

select pg_temp.afirmar_bloqueado(
  format('insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
          values (%L, ''compra'', 0, ''zero'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'lancamento de quantidade zero e recusado'
);

-- ------------------------------------- append-only, inclusive para as RPCs

insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
select pa.id, 'ajuste', 10, 'Credito inicial de teste'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

do $$
begin
  begin
    update lancamento_clave set quantidade = 999;
    raise exception 'FALHOU: o ledger aceitou update' using errcode = 'TS001';
  exception
    when sqlstate 'DS023' then null;
  end;
end $$;

do $$
begin
  begin
    delete from lancamento_clave;
    raise exception 'FALHOU: o ledger aceitou delete' using errcode = 'TS001';
  exception
    when sqlstate 'DS023' then null;
  end;
end $$;

select pg_temp.afirmar(
  (select count(*) from lancamento_clave) = 1,
  'o lancamento sobreviveu as duas tentativas'
);

select pg_temp.afirmar(
  (select count(*) from log_auditoria where tabela = 'lancamento_clave') = 1,
  'o lancamento entrou no rastro de auditoria'
);

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- Só os três pacotes ativos: o "Catálogo" inativo não aparece na Carteira.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from pacote_clave where nome like ''T %''') = 3,
  'artista ve so os pacotes ativos'
);

select pg_temp.afirmar_invisivel(
  'select 1 from pacote_clave where nome = ''T Catalogo''',
  'o pacote inativo e invisivel para o artista'
);

select pg_temp.afirmar_bloqueado(
  'insert into pacote_clave (nome, quantidade_claves, valor_centavos)
     values (''Meu pacote'', 1000, 1)',
  'artista nao cria pacote'
);

-- ------------------------------------------------ criar_pedido_clave -------

do $$
declare
  v_pedido_id uuid;
  v_pedido public.pedido_clave;
begin
  v_pedido_id := criar_pedido_clave(
    (select id from pacote_clave where nome = 'T Repertorio'), 'pix');

  select * into v_pedido from pedido_clave where id = v_pedido_id;

  perform pg_temp.afirmar(v_pedido.quantidade_claves = 30,
    'a quantidade e congelada do pacote');
  perform pg_temp.afirmar(v_pedido.valor_bruto_centavos = 30000,
    'o bruto e 30 Claves ao valor cheio: R$ 300,00');
  perform pg_temp.afirmar(v_pedido.valor_total_centavos = 28500,
    'o total e o preco do pacote: R$ 285,00');
  perform pg_temp.afirmar(v_pedido.desconto_centavos = 1500,
    'o desconto e a diferenca: R$ 15,00, ou 5%');
  perform pg_temp.afirmar(v_pedido.situacao = 'criado',
    'o pedido nasce em criado — criar_pedido_clave nao credita nada');
  perform pg_temp.afirmar(
    (select count(*) from lancamento_clave where pedido_clave_id = v_pedido_id) = 0,
    'criar o pedido nao lanca no ledger'
  );
end $$;

-- Pacote inativo não é comprável, mesmo com o id em mãos.
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

do $$
begin
  begin
    perform criar_pedido_clave(
      (select id from pacote_clave where nome = 'T Catalogo'), 'pix');
    raise exception 'FALHOU: comprou pacote inativo' using errcode = 'TS001';
  exception
    when sqlstate 'DS024' then null;
    -- O pacote inativo é invisível para o artista, então a RPC nem o encontra.
  end;
end $$;

select pg_temp.afirmar_bloqueado(
  'insert into pedido_clave (perfil_artista_id, quantidade_claves, valor_bruto_centavos,
                             valor_total_centavos, meio, situacao)
     values (meu_perfil_artista_id(), 1000, 1, 1, ''pix'', ''aprovado'')',
  'artista nao cria pedido direto — cunharia um pedido aprovado'
);

select pg_temp.afirmar_invisivel('select 1 from evento_provedor',
  'artista nao le evento_provedor');

-- =========================== idempotencia do webhook (gate da R2) =========

reset role;

select pg_temp.afirmar(
  registrar_evento_provedor('evt_1', 'asaas', 'PAYMENT_CONFIRMED', '{"id":"pay_1"}'::jsonb),
  'a primeira entrega do evento e nova'
);

select pg_temp.afirmar(
  not registrar_evento_provedor('evt_1', 'asaas', 'PAYMENT_CONFIRMED', '{"id":"pay_1"}'::jsonb),
  'a segunda entrega do MESMO evento devolve false — 200 sem efeito'
);

select pg_temp.afirmar(
  (select count(*) from evento_provedor) = 1,
  'o evento repetido nao duplicou a linha'
);

-- ------------------------------------- confirmar_pedido_clave, duas vezes --

do $$
declare
  v_pedido_id uuid := (select id from pedido_clave limit 1);
  v_primeiro bigint;
  v_segundo bigint;
begin
  v_primeiro := confirmar_pedido_clave(v_pedido_id);
  perform pg_temp.afirmar(v_primeiro is not null, 'a primeira confirmacao credita');

  -- A entrega duplicada do webhook.
  v_segundo := confirmar_pedido_clave(v_pedido_id);
  perform pg_temp.afirmar(v_segundo is null,
    'a segunda confirmacao devolve null, sem creditar de novo');

  perform pg_temp.afirmar(
    (select count(*) from lancamento_clave
      where pedido_clave_id = v_pedido_id and tipo = 'compra') = 1,
    'A COMPRA CREDITOU UMA UNICA VEZ sob webhook duplicado (gate da R2)'
  );

  perform pg_temp.afirmar(
    (select situacao from pedido_clave where id = v_pedido_id) = 'aprovado'
    and (select pago_em is not null from pedido_clave where id = v_pedido_id),
    'o pedido ficou aprovado e com pago_em'
  );
end $$;

-- E mesmo se a RPC estivesse errada, o indice unico impediria: e a defesa que
-- nao depende do codigo.
select pg_temp.afirmar_bloqueado(
  format('insert into lancamento_clave (perfil_artista_id, tipo, quantidade, pedido_clave_id, descricao)
          values (%L, ''compra'', 30, %L, ''segunda compra do mesmo pedido'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista'),
         (select id from pedido_clave limit 1)),
  'o indice unico barra uma segunda compra para o mesmo pedido'
);

-- A notificacao de compra confirmada saiu, e a conciliacao para o admin tambem.
select pg_temp.afirmar(
  (select count(*) from notificacao where evento = 'compra_claves_confirmada') = 1,
  'o artista foi notificado da compra'
);

-- Filtrado pelo ator: `registrar_notificacao` de evento com destinatário
-- `admin` **abre em leque** para toda a equipe ativa, e o seed da suíte E2E
-- criou mais dois membros. A afirmação é "o admin deste teste recebeu", não
-- "existe exatamente uma notificação no banco".
select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'nova_compra_claves'
      and perfil_id in (select id from ator)) = 1,
  'o admin recebeu a conciliacao'
);

-- ======================================= saldo_carteira, e o isolamento ===

-- Um envio ativo, para o `comprometido` ter conteudo.
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select pa.id, 'Faixa em curadoria', 'arquivo', a.id::text || '/f/1.mp3', 'em_curadoria'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
select f.id, pc.id, 2.00, now() + interval '72 hours', now() + interval '7 days'
from faixa f, perfil_curador pc where f.titulo = 'Faixa em curadoria';

insert into lancamento_clave (perfil_artista_id, tipo, quantidade, envio_id, descricao)
select f.perfil_artista_id, 'consumo', -2.00, e.id, 'Selecao de 1 curador'
from envio e join faixa f on f.id = e.faixa_id;

-- Uma devolucao, para o terceiro bloco do saldo.
insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
select pa.id, 'devolucao', 1.00, 'Devolucao por falta de resposta'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- 10 (ajuste) + 30 (compra) - 2 (consumo) + 1 (devolucao) = 39
select pg_temp.afirmar(
  (select disponivel from saldo_carteira) = 39.00,
  'disponivel e a soma do ledger: 10 + 30 - 2 + 1 = 39'
);

select pg_temp.afirmar(
  (select comprometido from saldo_carteira) = 2.00,
  'comprometido e o total dos envios ativos'
);

select pg_temp.afirmar(
  (select devolvido from saldo_carteira) = 1.00,
  'devolvido e a soma dos lancamentos de devolucao'
);

-- O ponto que o comentario da view alerta: `disponivel` JA exclui o
-- comprometido, porque o consumo foi debitado. Subtrair de novo daria 37.
select pg_temp.afirmar(
  (select disponivel - comprometido from saldo_carteira) = 37.00,
  'subtrair comprometido de disponivel daria 37 — e por isso a View nao faz isso'
);

-- **O teste que pega um `security_invoker` esquecido.** Sem a opcao na view, o
-- artista veria a linha de todos os artistas.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from saldo_carteira') = 1,
  'artista ve exatamente uma linha em saldo_carteira — a propria'
);

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  (select disponivel from saldo_carteira) = 0.00,
  'o vizinho, sem movimento, aparece com zero em vez de desaparecer'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from saldo_carteira') = 1,
  'O VIZINHO NAO VE O SALDO DE OUTRO ARTISTA'
);

select pg_temp.afirmar_invisivel('select 1 from lancamento_clave',
  'vizinho nao le o extrato alheio');

select pg_temp.afirmar_invisivel('select 1 from pedido_clave',
  'vizinho nao le o pedido alheio');

-- ==================================== como o admin de financeiro ==========

reset role;
update membro_admin set papel_admin = 'financeiro'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

-- Quatro lancamentos: ajuste +10, compra +30, consumo -2 e devolucao +1.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from lancamento_clave') = 4,
  'o financeiro le o ledger inteiro, para conciliar'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from pedido_clave') = 1,
  'o financeiro le os pedidos'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from pacote_clave where nome like ''T %''') = 4,
  'quem gere pacotes ve tambem os inativos'
);

select pg_temp.afirmar_invisivel('select 1 from evento_provedor',
  'nem o financeiro le evento_provedor — a tabela nao tem policy nenhuma');

-- Ativar e desativar pacote é dele.
update pacote_clave set ativo = true where nome = 'T Catalogo';

select pg_temp.afirmar(
  (select ativo from pacote_clave where nome = 'T Catalogo'),
  'quem gere pacotes ativa e desativa'
);

select pg_temp.afirmar_sem_efeito(
  'delete from pacote_clave where nome = ''T Catalogo''',
  'pacote nao e apagado — "excluir" e desativar, e as compras feitas continuam'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from pacote_clave', 'anon nao le pacote');
select pg_temp.afirmar_invisivel('select 1 from lancamento_clave', 'anon nao le o ledger');
select pg_temp.afirmar_invisivel('select 1 from saldo_carteira', 'anon nao le saldo');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0007_claves' as resultado;

rollback;
