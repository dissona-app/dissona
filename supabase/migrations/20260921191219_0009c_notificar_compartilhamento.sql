-- ============================================================================
-- 0009c · "Música compartilhada" — o evento que faltava emitir
--
-- A matriz de notificações (06) prevê **Música compartilhada (playlist / post /
-- matéria)**, origem 14.2, para o artista. A chave está no seed da `0005` desde
-- o primeiro dia e ninguém a emitia: `enviar_avaliacao` notifica
-- `feedback_concluido` e `credito_liberado`, e para aí.
--
-- É o evento que mais justifica existir dos três do módulo 14: o artista pagou
-- para ser ouvido, e que a faixa **saiu da plataforma** — entrou numa playlist,
-- virou post, virou matéria — é a notícia que ele não tem outro jeito de saber.
--
-- ## Por que um trigger, e não uma linha dentro da RPC
--
-- `enviar_avaliacao` tem 194 linhas. Acrescentar quatro exigiria
-- `create or replace` da função inteira — e cada cópia é uma chance de as duas
-- versões divergirem no dia em que alguém corrigir só uma. Foi o que a `0011c`
-- teve de fazer com `expurgar_contas_excluidas`, e ali não havia alternativa.
--
-- Aqui há: a conclusão da avaliação é um **estado**, e o gatilho natural de um
-- estado é um trigger. Ele dispara depois de a linha virar `concluida`, que é
-- exatamente quando o compartilhamento deixa de ser rascunho e passa a valer.
--
-- ## A ordem de que ele depende, e que é garantida
--
-- `enviar_avaliacao` grava o compartilhamento (passo 10) **antes** de marcar a
-- avaliação como concluída (passo 11). O trigger lê uma linha que já está lá.
-- Se um dia a ordem inverter, o `if not found` abaixo faz o trigger não
-- notificar — e não estourar, derrubando uma avaliação já paga por causa de uma
-- notificação.
--
-- `nao_compartilhou` não notifica: é o "Não vou compartilhar desta vez" do
-- passo 14.2, e anunciá-lo seria avisar que nada aconteceu.
-- ============================================================================

create or replace function notificar_compartilhamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_modalidade public.modalidade_compartilhamento;
  v_perfil_artista uuid;
  v_faixa_id uuid;
begin
  select c.modalidade into v_modalidade
    from public.compartilhamento c
   where c.avaliacao_id = new.id;

  if not found or v_modalidade = 'nao_compartilhou' then
    return new;
  end if;

  select f.perfil_artista_id, f.id into v_perfil_artista, v_faixa_id
    from public.envio e
    join public.faixa f on f.id = e.faixa_id
   where e.id = new.envio_id;

  if not found then
    return new;
  end if;

  perform public.registrar_notificacao(
    pa.perfil_id, 'musica_compartilhada',
    jsonb_build_object(
      'envio_id', new.envio_id,
      'faixa_id', v_faixa_id,
      'modalidade', v_modalidade))
  from public.perfil_artista pa where pa.id = v_perfil_artista;

  return new;
end;
$funcao$;

comment on function notificar_compartilhamento() is
  'Notifica o artista quando a avaliacao concluida traz compartilhamento (matriz 06, origem 14.2). nao_compartilhou nao notifica.';

-- `when`: só na transição para `concluida`, e não a cada update de rascunho.
-- Sem a cláusula, salvar o passo 14.2 e voltar notificaria a cada gravação.
create trigger avaliacao_notifica_compartilhamento
  after update on avaliacao
  for each row
  when (new.situacao = 'concluida' and old.situacao is distinct from 'concluida')
  execute function notificar_compartilhamento();
