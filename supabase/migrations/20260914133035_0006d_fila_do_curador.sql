-- ============================================================================
-- 0006d · `fila_do_curador` — o que o curador vê da faixa e de quem a mandou
--
-- ## O problema, que é o mesmo da 0002f com os papéis trocados
--
-- O curador enxerga `envio` (é dele) e `faixa` (a policy da `0006b` libera via
-- `curador_tem_envio_ativo_na_faixa`). O que ele **não** enxerga é o **nome do
-- artista**: ele mora em `perfil`, privado por
-- `id = auth.uid() or e_admin()`, e `perfil_artista` é igualmente restrito ao
-- dono.
--
-- A fila (13) mostra "Música (capa, artista, título)" e **ordena por artista**.
-- Sem o nome, a coluna fica vazia e a ordenação não existe. E, como o embed do
-- PostgREST vira inner join, o sintoma seria a fila **vazia** — sem erro.
--
-- ## A regra de visibilidade é mais estreita que a da 0002f
--
-- Curador aprovado é vitrine: qualquer autenticado o vê. Artista não é. Aqui a
-- exposição é condicional ao vínculo de trabalho: o curador vê o artista **da
-- faixa que ele tem para avaliar**, e de mais nenhuma.
--
-- Como a view não tem `security_invoker`, ela roda como o dono e ignora a RLS
-- das tabelas base — então o `where` **é** a fronteira de segurança, e não uma
-- conveniência. `meu_perfil_curador_id()` é `security definer` e resolve
-- `auth.uid()`, então cada sessão vê só a própria fila. Mexer neste `where` é
-- mexer no controle de acesso.
-- ============================================================================

create view fila_do_curador as
select
  e.id                as envio_id,
  e.situacao,
  e.prazo_em,
  e.devolucao_em,
  e.criado_em         as enviado_em,
  e.total_claves,
  f.id                as faixa_id,
  f.titulo,
  f.genero,
  f.capa_caminho,
  f.duracao_segundos,
  f.contexto_curador,
  -- O caminho do áudio: o curador precisa dele para o player. A leitura do
  -- objeto em si continua sendo decidida pela policy do bucket `faixas`, que
  -- exige envio ativo — esta coluna é só o endereço.
  f.arquivo_caminho,
  coalesce(p.nome_exibicao, p.nome_completo) as artista
from envio e
join faixa f          on f.id = e.faixa_id
join perfil_artista pa on pa.id = f.perfil_artista_id
join perfil p          on p.id = pa.perfil_id
where e.perfil_curador_id = meu_perfil_curador_id();

comment on view fila_do_curador is
  'Fila do curador (13) com o nome do artista. Sem security_invoker: o `where` por meu_perfil_curador_id() E a fronteira de acesso. Ver o cabecalho da 0006d.';

revoke all on fila_do_curador from public, anon;
grant select on fila_do_curador to authenticated;
