-- ============================================================================
-- 0008b · avaliação só sobre o próprio envio
--
-- ## A falha, achada pela suíte de RLS da 0008
--
-- As policies de insert e update de `avaliacao` conferiam só
-- `perfil_curador_id = meu_perfil_curador_id()`. Nada ligava a avaliação ao
-- **envio**: um curador conseguia criar, em nome próprio, a avaliação do envio
-- de outro curador. Como `avaliacao.envio_id` é `unique`, o dono real nunca
-- mais conseguiria iniciar a dele — o envio envelheceria até a devolução de 7
-- dias. `enviar_avaliacao` recusaria concluir (`DS020`), então não havia ganho
-- indevido; o dano era bloquear o trabalho alheio.
--
-- Nenhuma linha divergente existia no banco quando esta migration foi escrita.
--
-- ## A correção
--
-- O `with check` passa a exigir que o envio seja do curador da sessão. Pela
-- regra da `0006b`, a consulta a `envio` fica numa função `security definer`,
-- e não num `exists` direto na policy.
-- ============================================================================

create or replace function envio_e_meu(p_envio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.envio e
     where e.id = p_envio_id
       and e.perfil_curador_id = public.meu_perfil_curador_id()
  );
$funcao$;

comment on function envio_e_meu(uuid) is
  'O envio e do curador da sessao? Para o with check de avaliacao (0008b).';

revoke execute on function envio_e_meu(uuid) from public, anon;
grant execute on function envio_e_meu(uuid) to authenticated;

drop policy "avaliacao: curador dono cria" on avaliacao;
create policy "avaliacao: curador dono cria"
  on avaliacao for insert
  to authenticated
  with check (perfil_curador_id = meu_perfil_curador_id() and envio_e_meu(envio_id));

-- O update também: sem isto, o dono de um rascunho trocaria o `envio_id` para
-- o envio de outro curador e chegaria ao mesmo bloqueio.
drop policy "avaliacao: curador dono edita o rascunho" on avaliacao;
create policy "avaliacao: curador dono edita o rascunho"
  on avaliacao for update
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id() and envio_e_meu(envio_id));
