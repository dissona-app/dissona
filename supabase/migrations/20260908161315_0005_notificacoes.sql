-- ============================================================================
-- 0005 · Notificações  (R1)
--
-- `evento_notificacao` (catálogo, seed completo), `notificacao`,
-- `preferencia_notificacao` e `registrar_notificacao()`. Ver data-model §6 e a
-- matriz em docs/prd/06-matriz-notificacoes.md.
--
-- A tabela nasce na R1 e as centrais de leitura (módulos 10 e 18) só chegam na
-- R5. O que a R5 acrescenta é a interface, não o registro — por isso o
-- catálogo nasce **completo**, com os eventos de todas as releases. Sem isso
-- seria preciso reabrir dez módulos entregues para retroagir eventos.
--
-- Dois desvios do data-model, justificados no lugar:
--   · `evento_notificacao.destinatario` é `papel[]`, não `papel`;
--   · `notificacao` ganha `canais`, e `corpo` é nulável.
-- ============================================================================

-- ------------------------------------------------------- evento_notificacao

create table evento_notificacao (
  chave text primary key,
  titulo text not null,
  -- `papel[]` e não `papel`: cinco eventos da matriz são idênticos para artista
  -- e curador (recuperação de senha, verificação de e-mail, confirmação de
  -- alteração de credencial, bloqueio de conta). Com um escalar, ou se duplicam
  -- chaves — e a chave é PK referenciada por duas tabelas — ou a tela de
  -- preferências de um dos dois papéis perde o evento.
  destinatario papel[] not null,
  canais_padrao canal_notificacao[] not null,
  critico boolean not null default false,
  rota_destino text not null,
  modulo_origem text not null,

  constraint evento_notificacao_tem_destinatario
    check (array_length(destinatario, 1) >= 1),
  constraint evento_notificacao_tem_canal
    check (array_length(canais_padrao, 1) >= 1)
);

comment on table evento_notificacao is
  'Catalogo estatico dos eventos. Leitura para autenticado; nenhuma policy de escrita — evento novo e migration.';
comment on column evento_notificacao.critico is
  'Quando true a preferencia do usuario e ignorada (matriz, "eventos criticos nao sao desativaveis").';
comment on column evento_notificacao.rota_destino is
  'Destino padrao. Quando o caminho depende de um id, registrar_notificacao recebe p_rota e sobrescreve.';

-- ---------------------------------------------------------------- notificacao

create table notificacao (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfil (id) on delete cascade,
  evento text not null references evento_notificacao (chave) on delete restrict,
  titulo text not null,
  corpo text,
  contexto jsonb not null default '{}'::jsonb,
  rota text,
  -- Desvio do data-model: os canais **efetivos** desta notificação, já
  -- resolvidos contra a preferência do usuário. Sem esta coluna, um evento de
  -- e-mail com in-app desligado ou não geraria linha (e ninguém enviaria o
  -- e-mail) ou geraria uma linha que apareceria na caixa de entrada da R5
  -- contra a vontade do usuário.
  canais canal_notificacao[] not null,
  lida_em timestamptz,
  enviada_email_em timestamptz,
  criado_em timestamptz not null default now(),

  constraint notificacao_tem_canal check (array_length(canais, 1) >= 1)
);

comment on table notificacao is
  'Notificacoes gravadas. Nenhum insert direto: so por registrar_notificacao (data-model 6).';
comment on column notificacao.corpo is
  'Nulavel, ao contrario do data-model: o texto do detalhe e composto pela View a partir de contexto, que e para isso que contexto existe.';

create index notificacao_caixa_idx on notificacao (perfil_id, criado_em desc);
create index notificacao_nao_lidas_idx on notificacao (perfil_id) where lida_em is null;

-- Fila de envio de e-mail: o que tem o canal e ainda não saiu.
create index notificacao_email_pendente_idx on notificacao (criado_em)
  where enviada_email_em is null;

-- ------------------------------------------------------ preferencia_notificacao

create table preferencia_notificacao (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfil (id) on delete cascade,
  evento text not null references evento_notificacao (chave) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default true,

  constraint preferencia_notificacao_unica unique (perfil_id, evento)
);

comment on table preferencia_notificacao is
  'Preferencia por evento (10.2 / 17.3 / 18.2). Evento critico ignora esta tabela.';

-- ------------------------------------------------- registrar_notificacao

-- Todo módulo que emite evento chama esta função. Nenhum `insert` direto em
-- `notificacao` — é o que garante que a preferência e o flag `critico` sejam
-- sempre respeitados, em vez de reimplementados em dez lugares.
--
-- Não dispara HTTP aqui. A função é chamada de dentro de `enviar_avaliacao` e
-- de `confirmar_selecao_curadores`: um `pg_net` dentro da transação de dinheiro
-- acoplaria o ledger à disponibilidade do provedor de e-mail. A linha fica com
-- `enviada_email_em` nulo e um consumidor a processa.
create or replace function registrar_notificacao(
  p_perfil_id uuid,
  p_evento text,
  p_contexto jsonb default '{}'::jsonb,
  p_rota text default null,
  p_corpo text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_evento public.evento_notificacao;
  v_pref public.preferencia_notificacao;
  v_canais public.canal_notificacao[];
  v_id uuid;
begin
  select * into v_evento
    from public.evento_notificacao e
   where e.chave = p_evento;

  -- Evento fora do catálogo é bug de código, não caso de borda: falhar alto.
  if not found then
    raise exception 'evento de notificacao desconhecido: %', p_evento
      using errcode = 'DS030';
  end if;

  if v_evento.critico then
    v_canais := v_evento.canais_padrao;
  else
    select * into v_pref
      from public.preferencia_notificacao p
     where p.perfil_id = p_perfil_id and p.evento = p_evento;

    if not found then
      v_canais := v_evento.canais_padrao;
    else
      v_canais := array(
        select c from unnest(v_evento.canais_padrao) as c
         where (c = 'in_app' and v_pref.in_app) or (c = 'email' and v_pref.email)
      );
    end if;
  end if;

  -- Preferência que desliga todos os canais de um evento não crítico: não há
  -- o que registrar, e devolver nulo é a resposta honesta.
  if coalesce(array_length(v_canais, 1), 0) = 0 then
    return null;
  end if;

  insert into public.notificacao
    (perfil_id, evento, titulo, corpo, contexto, rota, canais)
  values
    (p_perfil_id, p_evento, v_evento.titulo, p_corpo,
     coalesce(p_contexto, '{}'::jsonb),
     coalesce(p_rota, v_evento.rota_destino), v_canais)
  returning id into v_id;

  return v_id;
end;
$funcao$;

comment on function registrar_notificacao(uuid, text, jsonb, text, text) is
  'Unico caminho para gravar notificacao. Resolve o catalogo, aplica a preferencia respeitando critico, e enfileira o e-mail sem sair da transacao.';

-- Nem `authenticated` executa: quem emite evento é uma RPC ou uma Server
-- Action com um serviço por trás, nunca o cliente direto.
revoke execute on function registrar_notificacao(uuid, text, jsonb, text, text)
  from public, anon, authenticated;

-- --------------------------------------------------- seed do catálogo ----

-- 42 eventos, das cinco releases, derivados de docs/prd/06-matriz-notificacoes.md.
-- Os `rota_destino` usam os slugs declarados em
-- src/componentes/shell/navegacao-por-ambiente.ts, que é a fonte das URLs do
-- produto. Alguns apontam para telas de release futura: é intencional, porque
-- a central que consome estas rotas também é da R5.
insert into evento_notificacao
  (chave, titulo, destinatario, canais_padrao, critico, rota_destino, modulo_origem) values

-- Compartilhados entre artista e curador ------------------------------------
  ('senha_recuperacao_solicitada', 'Recuperação de senha solicitada',
   '{artista,curador}', '{email}', false, '/redefinir-senha', '1.2'),
  ('email_verificacao', 'Confirme seu e-mail',
   '{artista,curador}', '{email}', false, '/verificar-email', '1.1'),
  ('credencial_alterada', 'Seus dados de acesso foram alterados',
   '{artista,curador}', '{email}', false, '/', '7.2/17.2'),
  ('conta_bloqueada', 'Sua conta foi bloqueada',
   '{artista,curador}', '{email}', true, '/entrar', '23.2/20.2'),

-- Artista --------------------------------------------------------------------
  ('compra_claves_confirmada', 'Compra de Claves confirmada',
   '{artista}', '{in_app,email}', false, '/artista/carteira', '5.2'),
  ('saldo_claves_baixo', 'Seu saldo de Claves está baixo',
   '{artista}', '{in_app}', false, '/artista/carteira/pacotes', '5'),
  ('selecao_confirmada', 'Seleção confirmada e Claves aplicadas',
   '{artista}', '{in_app}', false, '/artista/envios', '4'),
  ('musica_recebida_pelo_curador', 'Sua música chegou ao curador',
   '{artista}', '{in_app}', false, '/artista/envios', '3/13'),
  ('feedback_concluido', 'Feedback concluído',
   '{artista}', '{in_app,email}', false, '/artista/envios', '14'),
  ('relatorio_musica_disponivel', 'O relatório da sua música está pronto',
   '{artista}', '{in_app}', false, '/artista/catalogo', '6.1'),
  ('musica_compartilhada', 'Sua música foi compartilhada',
   '{artista}', '{in_app,email}', false, '/artista/envios', '14.2'),
  ('pedido_detalhes_materia', 'Um curador pediu detalhes para a matéria',
   '{artista}', '{in_app,email}', false, '/artista/envios', '6.4'),
  ('claves_devolvidas', 'Claves devolvidas por falta de resposta',
   '{artista}', '{in_app,email}', true, '/artista/carteira/extrato', 'sla/22.2'),
  ('estorno_concluido', 'Estorno concluído',
   '{artista}', '{in_app,email}', true, '/artista/carteira/extrato', '22.2'),

-- Curador --------------------------------------------------------------------
  ('bronze_aprovado', 'Bem-vindo: seu cadastro Bronze foi aprovado',
   '{curador}', '{in_app,email}', false, '/curador', '12.5'),
  ('cadastro_em_analise', 'Seu cadastro está em análise',
   '{curador}', '{in_app,email}', false, '/curador/cadastro', '12.5'),
  ('prata_decidida', 'Decisão sobre a sua classe Prata',
   '{curador}', '{in_app,email}', true, '/curador/metricas', '20.3'),
  ('nova_musica_na_fila', 'Nova música na sua fila',
   '{curador}', '{in_app,email}', false, '/curador/fila', '4/13'),
  ('prazo_72h_proximo', 'O prazo de 72h está próximo',
   '{curador}', '{in_app,email}', true, '/curador/fila', '13'),
  ('credito_liberado', 'Crédito liberado',
   '{curador}', '{in_app}', false, '/curador/financeiro', '14.4'),
  ('avaliacao_recebida_do_artista', 'O artista avaliou a sua devolutiva',
   '{curador}', '{in_app}', false, '/curador/metricas', '6.3'),
  ('saque_solicitado', 'Saque solicitado',
   '{curador}', '{in_app}', false, '/curador/financeiro', '15.1'),
  ('saque_processado', 'Saque em processamento',
   '{curador}', '{in_app,email}', false, '/curador/financeiro', '22.3'),
  ('saque_pago', 'Saque pago',
   '{curador}', '{in_app,email}', false, '/curador/financeiro', '22.3'),
  ('payout_falhou', 'Falha no pagamento do seu saque',
   '{curador}', '{in_app,email}', true, '/curador/financeiro', '22.3'),
  ('elegivel_ouro', 'Você está elegível a Ouro',
   '{curador}', '{in_app,email}', false, '/curador/metricas', '16.1'),
  ('classe_promovida', 'Sua classe foi promovida',
   '{curador}', '{in_app,email}', false, '/curador/metricas', '20.4'),
  ('classe_rebaixada', 'Sua classe foi rebaixada',
   '{curador}', '{in_app,email}', true, '/curador/metricas', '20.4'),
  ('denuncia_ou_penalidade', 'Denúncia recebida ou penalidade aplicada',
   '{curador}', '{in_app,email}', true, '/curador/metricas', '23.1'),

-- Admin ----------------------------------------------------------------------
  ('novo_cadastro_concluido', 'Novo cadastro na plataforma',
   '{admin}', '{in_app}', false, '/admin/usuarios', '1.1'),
  ('curador_prata_em_analise', 'Curador Prata aguardando aprovação',
   '{admin}', '{in_app,email}', false, '/admin/aprovacoes', '12.5'),
  ('candidato_ouro_dossie', 'Dossiê de candidato a Ouro disponível',
   '{admin}', '{in_app,email}', false, '/admin/aprovacoes', '16.1'),
  ('nova_compra_claves', 'Nova compra de Claves',
   '{admin}', '{in_app}', false, '/admin/financeiro', '5.2'),
  ('alerta_comportamento_suspeito', 'Alerta de comportamento suspeito',
   '{admin}', '{in_app}', false, '/admin/moderacao', '23'),
  ('denuncia_recebida', 'Denúncia recebida',
   '{admin}', '{in_app,email}', false, '/admin/moderacao', '23.1'),
  ('saque_a_aprovar', 'Saque aguardando aprovação',
   '{admin}', '{in_app}', false, '/admin/financeiro', '15.1'),
  ('estorno_pendente', 'Estorno pendente',
   '{admin}', '{in_app}', false, '/admin/financeiro', '22.2'),
  ('convite_membro_enviado', 'Convite de membro enviado',
   '{admin}', '{email}', false, '/admin/equipe', '27.3'),
  ('permissoes_alteradas', 'Permissões alteradas',
   '{admin}', '{in_app}', false, '/admin/equipe/papeis', '27.4'),
  ('senha_recuperacao_admin', 'Recuperação de senha administrativa',
   '{admin}', '{email}', false, '/admin/redefinir-senha', '19.1'),
  ('login_suspeito_admin', 'Login suspeito na área administrativa',
   '{admin}', '{email}', false, '/admin', '19'),
  ('pacote_clave_alterado', 'Pacote de Claves alterado',
   '{admin}', '{in_app}', false, '/admin/pacotes', '21');

-- Não existe evento de "novo cadastro admin": contas de admin nascem por
-- convite, não por autocadastro. O board registra que essa notificação foi
-- copiada por engano do fluxo artista/curador (matriz, nota final).

-- ------------------------------------------------------------------------ RLS

alter table evento_notificacao enable row level security;
alter table notificacao enable row level security;
alter table preferencia_notificacao enable row level security;

create policy "evento_notificacao: autenticado le o catalogo"
  on evento_notificacao for select
  to authenticated
  using (true);

-- Sem escrita: evento novo é migration.

create policy "notificacao: dono le as proprias"
  on notificacao for select
  to authenticated
  using (perfil_id = auth.uid());

-- O update existe só para marcar como lida. A trava de coluna está no trigger
-- abaixo: RLS filtra linha, não coluna, e sem isso o dono reescreveria o
-- título e o corpo da própria notificação.
create policy "notificacao: dono marca como lida"
  on notificacao for update
  to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

-- Sem insert: só `registrar_notificacao`.

create or replace function proibir_reescrever_notificacao()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  if new.perfil_id is distinct from old.perfil_id
     or new.evento is distinct from old.evento
     or new.titulo is distinct from old.titulo
     or new.corpo is distinct from old.corpo
     or new.contexto is distinct from old.contexto
     or new.rota is distinct from old.rota
     or new.canais is distinct from old.canais
     or new.criado_em is distinct from old.criado_em then
    raise exception 'em notificacao so lida_em pode mudar'
      using errcode = 'DS022';
  end if;
  return new;
end;
$funcao$;

revoke execute on function proibir_reescrever_notificacao() from public, anon, authenticated;

create trigger notificacao_so_lida_em
  before update on notificacao
  for each row execute function proibir_reescrever_notificacao();

create policy "preferencia_notificacao: dono gerencia as proprias"
  on preferencia_notificacao for all
  to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

create policy "preferencia_notificacao: admin le para diagnostico"
  on preferencia_notificacao for select
  to authenticated
  using (e_admin());
