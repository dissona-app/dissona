-- ============================================================================
-- 0001c · O que a sessão precisa saber sobre o perfil  (R1)
--
-- Três colunas e um trigger de guarda. Todas as quatro coisas são exigidas por
-- requisito da R1 e nenhuma existia — a fatia de autenticação não fecha sem
-- elas.
--
--   `onboarding_visto_em`   RF-007: "o tour não reaparece". Sem persistência,
--                           o onboarding reabriria a cada login.
--   `ultimo_ambiente`       RF-008: "entro no último ambiente usado". Hoje
--                           `inicioDoUsuario()` decide por prioridade fixa
--                           (artista > curador > admin), o que manda um
--                           curador-e-artista sempre para o ambiente errado.
--   `senha_alterada_em`     Tela 27.1 exibe "Alterada em 12 de março de 2026".
--                           O Supabase Auth não expõe essa data.
--
-- Sufixo de letra, e não `0012`: a faixa `0012+` é da R3 (data-model §11), e
-- isto é `perfil`, que nasceu na `0001`.
-- ============================================================================

-- ------------------------------------------------------------------- colunas

alter table perfil
  add column onboarding_visto_em timestamptz,
  add column ultimo_ambiente papel,
  add column senha_alterada_em timestamptz;

comment on column perfil.onboarding_visto_em is
  'Primeira conclusao ou pulo do tour (RF-007). "Rever onboarding" reabre sem regravar.';
comment on column perfil.ultimo_ambiente is
  'Ambiente do ultimo acesso (RF-008). Nulo antes do primeiro login com papel definido.';
comment on column perfil.senha_alterada_em is
  'Data da ultima troca de senha, exibida em 27.1 e 7.4. O Auth nao a expoe.';

-- ------------------------------------------- guarda da situação da conta ----

-- Furo que existia desde a `0001`: a policy "perfil: dono atualiza a propria
-- linha" não filtra coluna — RLS filtra linha —, então o dono podia escrever
-- `situacao` à vontade. Na prática: uma conta **bloqueada** se reativava com um
-- `update` de uma linha, e o bloqueio de 20.2/23.2 valia nada.
--
-- O mesmo raciocínio de `proibir_autopromocao_de_classe` (0002), aplicado a
-- `perfil`: a policy libera a linha, o trigger protege a coluna.
create or replace function proibir_autoalteracao_de_situacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  if new.situacao is not distinct from old.situacao then
    return new;
  end if;

  -- Normaliza o marco dos 30 dias em toda transição, inclusive nas do admin.
  -- `desativada` sem `desativada_em` ficaria fora do recorte do índice parcial
  -- `perfil_desativada_em_idx`, que é exatamente o que
  -- `expurgar_contas_excluidas` (0011) consulta — a conta nunca seria apagada,
  -- e o descumprimento da LGPD seria silencioso.
  if new.situacao = 'desativada' then
    new.desativada_em := coalesce(new.desativada_em, now());
  elsif new.situacao = 'ativa' then
    new.desativada_em := null;
  end if;

  -- Sem sessão é contexto de sistema: o job de expurgo (`security definer`,
  -- disparado por `pg_cron`) muda `desativada` para `excluida` com `auth.uid()`
  -- nulo, e a service role opera do mesmo jeito. Barrar aqui derrubaria o job.
  if auth.uid() is null then
    return new;
  end if;

  if public.e_admin() then
    return new;
  end if;

  -- O dono percorre só o par exclusão/reversão (RF-024): desativa a conta, e
  -- volta atrás dentro dos 30 dias entrando de novo. `bloqueada` é decisão do
  -- admin; `excluida` é do job.
  if (old.situacao = 'ativa' and new.situacao = 'desativada')
     or (old.situacao = 'desativada' and new.situacao = 'ativa') then
    return new;
  end if;

  raise exception 'situacao da conta e decisao do admin'
    using errcode = 'DS020';
end;
$funcao$;

comment on function proibir_autoalteracao_de_situacao() is
  'Trigger em perfil: o dono so faz ativa<->desativada (RF-024). bloqueada e excluida sao do admin e do job.';

revoke execute on function proibir_autoalteracao_de_situacao()
  from public, anon, authenticated;

-- Nome depois de `perfil_atualizado_em` na ordem alfabética, que é a ordem em
-- que o Postgres dispara triggers de mesmo timing — então `atualizado_em` já
-- está resolvido quando esta roda, e o `new` que ela devolve é o final.
create trigger perfil_situacao_so_pelo_admin
  before update on perfil
  for each row execute function proibir_autoalteracao_de_situacao();
