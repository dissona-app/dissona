-- ============================================================================
-- 0004 · Configuração  (R1)
--
-- Chave-valor tipada. **Nenhum número de negócio vive no código** (RNF-011,
-- architecture §1.1). Ver data-model §5.
--
-- O seed diverge do data-model em dois pontos, e os dois vêm do protótipo da
-- R2, que tem precedência sobre o board (AGENTS.md):
--
--  1. `remuneracao.<classe>` muda de forma. O data-model lê os três números
--     como (atraso, prazo, teto); o protótipo lê como (piso, teto na
--     avaliação, teto com compartilhamento), e as legendas da própria tela não
--     deixam margem: "Piso da classe dentro das 72h" exibe 30% para Bronze, e
--     "Teto da classe Bronze: 38% na avaliação e 50% com compartilhamento".
--     Logo `{piso, teto_base, teto_max}`.
--
--  2. `teto_atraso_percentual` **sai**. No protótipo o atraso não é um teto de
--     50%: é uma queda de 8 pontos no piso, com piso mínimo de 15 ("a faixa
--     passou das 72h, então o piso da classe cai 8 pontos"). No lugar entram
--     `penalidade_atraso_pontos` e `piso_minimo_atraso_percentual`.
--
-- Consequência a registrar: RF-066 de requirements.md afirma que dentro de 72h
-- "o piso é 38% (Bronze)". Está incorreto — 38% é o teto na avaliação. Um
-- Bronze que entrega no prazo sem nenhum opcional recebe 30%.
-- ============================================================================

create table configuracao (
  chave text primary key,
  valor jsonb not null,
  descricao text not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references perfil (id) on delete set null,

  constraint configuracao_descricao_nao_vazia check (char_length(btrim(descricao)) > 0)
);

comment on table configuracao is
  'Thresholds, prazos, pisos e tetos. Alterar aqui nao exige deploy; hardcodar no codigo e proibido (RNF-011).';

create trigger configuracao_atualizado_em
  before update on configuracao
  for each row execute function atualizar_atualizado_em();

-- 9ª tabela auditada — o data-model lista oito. Mudar um piso de remuneração é
-- a alteração mais sensível do sistema, e ficaria fora do rastro.
create trigger configuracao_auditoria
  after insert or update or delete on configuracao
  for each row execute function registrar_auditoria();

-- ---------------------------------------------------------------- seed ----

insert into configuracao (chave, valor, descricao) values

-- Claves e margem ------------------------------------------------------------
  ('clave_valor_centavos', '1000',
   'Valor de 1 Clave em centavos. 1 Clave = R$ 10,00 (regras 1).'),
  ('margem_plataforma_percentual', '50',
   'Margem de REFERENCIA da plataforma. Nao entra em calcular_remuneracao: sob remuneracao.base = bruto os percentuais por classe determinam o repasse, e os 50% passam a ser media, nao retencao fixa. Ouro no prazo (50%) e exatamente o ponto de paridade.'),

-- SLA ------------------------------------------------------------------------
  ('prazo_avaliacao_horas', '72',
   'Prazo para o curador responder com o piso cheio da classe (regras 6).'),
  ('prazo_devolucao_dias', '7',
   'Sem resposta neste prazo, a Clave volta ao artista automaticamente (RF-070).'),

-- Avaliação ------------------------------------------------------------------
  ('escuta_minima_percentual', '60',
   'Gate de escuta. 60% vem da copy do prototipo do curador, a tela que aplica a regra: "a avaliacao so e aceita a partir de 60% da faixa ouvidos". Resolve open-questions #1; a promessa de 100% na copy do artista e que precisa mudar.'),
  ('escuta_exigida_quando_link', 'true',
   'Se a faixa enviada por link tambem exige o arquivo de audio, para a escuta ser mensuravel. Um iframe de Spotify/YouTube nao expoe posicao de reproducao, entao com false o gate de escuta deixa de existir para essas faixas. Ver open-questions #7.'),
  ('feedback_min_caracteres', '150',
   'Minimo do feedback escrito para render acrescimo (regras 3.1).'),
  ('justificativa_min_caracteres', '250',
   'Minimo da justificativa por criterio para render acrescimo (regras 3.1).'),
  ('criterios_obrigatorios',
   '["afinacao", "ritmo", "melodia", "personalidade", "conexao"]',
   'Os cinco criterios obrigatorios, conforme as flags do prototipo do curador. Resolve open-questions #3. Atencao: NAO e um por grupo — Execucao tecnica tem dois e Producao nenhum. Esta chave e a fonte unica; criterio.obrigatorio e conveniencia de UI.'),

-- Remuneração ----------------------------------------------------------------
  ('remuneracao.base', '"bruto"',
   'Sobre o que os percentuais por classe incidem. "bruto" = valor pago pelo artista (Claves x clave_valor_centavos), que e o que o prototipo faz: "{pct}% de {valor} pagos pelo artista". A alternativa "cota_curador" incidiria sobre os 50% e deixaria a plataforma com 69-81%. Resolve open-questions #5.'),
  ('remuneracao.bronze', '{"piso": 30, "teto_base": 38, "teto_max": 50}',
   'Bronze: piso dentro das 72h, teto na avaliacao e teto com compartilhamento.'),
  ('remuneracao.prata', '{"piso": 40, "teto_base": 43, "teto_max": 55}',
   'Prata: piso dentro das 72h, teto na avaliacao e teto com compartilhamento.'),
  ('remuneracao.ouro', '{"piso": 45, "teto_base": 50, "teto_max": 62}',
   'Ouro: piso dentro das 72h, teto na avaliacao e teto com compartilhamento.'),
  ('penalidade_atraso_pontos', '8',
   'Quantos pontos percentuais o piso da classe perde fora das 72h. Do prototipo: "a faixa passou das 72h, entao o piso da classe cai 8 pontos".'),
  ('piso_minimo_atraso_percentual', '15',
   'Piso absoluto depois da penalidade de atraso.'),
  ('acrescimo_onze_criterios_percentual', '3',
   'Acrescimo por responder os onze criterios. Capado em teto_base.'),
  ('acrescimo_justificativa_percentual', '3',
   'Acrescimo por justificativa longa. Capado em teto_base.'),
  ('acrescimo_justificativa_min_itens', '1',
   'Quantos criterios precisam de justificativa >= justificativa_min_caracteres para o acrescimo valer. O prototipo concede com um item, e o acrescimo e booleano — nao e 3% por item, que estouraria todos os tetos.'),
  ('acrescimo_feedback_150_percentual', '3',
   'Acrescimo por feedback >= feedback_min_caracteres. Capado em teto_base.'),
  ('acrescimo_compartilhamento_percentual', '8',
   'Acrescimo por compartilhamento. E o unico que passa de teto_base e vai ate teto_max — por isso 8, e nao 3.'),
  ('compartilhamento.acrescimo_retido', 'false',
   'Se o acrescimo por compartilhamento fica retido ate a equipe verificar. O prototipo se contradiz: a copy diz que a equipe confere antes de liberar, mas o calculo soma na hora e o cenario C5 diz que o credito libera ao confirmar. Adotado o calculo. Ver open-questions #8.'),

-- Classe ---------------------------------------------------------------------
  ('classe.prata_min_credenciais', '2',
   'Credenciais verificaveis para ser candidato a Prata (regras 2).'),
  ('classe.ouro_min_curadorias', '60',
   'Curadorias concluidas para elegibilidade a Ouro (regras 2.1).'),
  ('classe.ouro_min_ciclos', '2',
   'Ciclos consecutivos em Prata para elegibilidade a Ouro.'),
  ('classe.ouro_min_score', '0.85',
   'Score composto sustentado para elegibilidade a Ouro.'),
  ('classe.rebaixamento_score', '0.75',
   'Score abaixo do qual o Ouro entra em revisao (regras 2.2).'),
  ('ciclo_meses', '3',
   'Duracao de um ciclo de avaliacao de classe.'),

-- Ranking (R3) ---------------------------------------------------------------
  ('ranking.pesos',
   '{"notas": 0.25, "prazo": 0.33, "calibracao": 0.27, "compartilhamento": 0.15}',
   'Pesos do ranking (regras 4.1). Os pesos divergem entre tabela e diagrama do discovery; adotada a tabela. Ver open-questions #14. Somam 1.'),

-- Upload ---------------------------------------------------------------------
  ('upload.tamanho_max_mb', '50',
   'Tamanho maximo do arquivo de faixa (regras 7).'),
  ('upload.formatos', '["wav", "mp3"]',
   'Formatos aceitos de faixa (regras 7).'),
  ('upload.armazenar_sempre', 'true',
   'Se o audio e armazenado mesmo quando a faixa esta no streaming. true porque a escuta e medida por um <audio> nosso, e sem arquivo o gate de escuta fica inverificavel. Ver open-questions #7.'),

-- LGPD -----------------------------------------------------------------------
  ('lgpd.dias_expurgo', '30',
   'Dias entre a desativacao da conta e o expurgo (regras 10).');

-- ------------------------------------------------------------------------ RLS

alter table configuracao enable row level security;

-- Leitura para qualquer sessão autenticada: a tela de avaliação precisa de meia
-- dúzia de thresholds por render.
create policy "configuracao: autenticado le"
  on configuracao for select
  to authenticated
  using (true);

create policy "configuracao: so quem administra escreve"
  on configuracao for update
  to authenticated
  using (tem_permissao('configuracao', true))
  with check (tem_permissao('configuracao', true));

-- Sem insert nem delete: chave nova é migration, não ato de usuário. Assim o
-- admin também não consegue apagar uma chave que o código exige.
