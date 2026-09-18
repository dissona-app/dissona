-- ============================================================================
-- 0011c · O expurgo passa a apagar o cartão salvo
--
-- `cartao_salvo` nasceu na `0007e`, depois da `0011` — então a anonimização
-- não sabia dela. Guardar o meio de pagamento de uma conta excluída é o oposto
-- do que este job existe para fazer: a pessoa pediu para sair e continuaria
-- cobrável.
--
-- ## Por que uma migration separada da `0007e`
--
-- Porque o alvo é uma função de **outra** migration. Reescrever
-- `expurgar_contas_excluidas` lá dentro amarraria a ordem de aplicação: num
-- banco reconstruído na ordem do nome do arquivo, a `0007e` viria antes da
-- `0011`, criaria a função e a `0011` a substituiria — apagando justo o
-- `delete` que a `0007e` tinha acrescentado. Numerada `0011c`, ela vem depois
-- em qualquer ordenação, por nome ou por timestamp.
--
-- O `delete` vai junto das credenciais e das mídias, e pela mesma razão: é
-- conteúdo da pessoa, e não linha financeira com retenção fiscal. A **cobrança**
-- que gerou o token fica, por retenção; o que some é a possibilidade de cobrar
-- de novo.
--
-- O resto do corpo é idêntico ao da `0011` — está repetido porque
-- `create or replace` não tem "altere só esta linha". O comentário da função,
-- reescrito pela `0011b`, sobrevive: `create or replace` preserva `comment on`.
-- ============================================================================

create or replace function expurgar_contas_excluidas(p_limite integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_dias integer;
  v_perfil record;
  v_n integer := 0;
begin
  select (c.valor::text)::integer into v_dias
    from public.configuracao c where c.chave = 'lgpd.dias_expurgo';
  if v_dias is null then
    raise exception 'configuracao lgpd.dias_expurgo ausente' using errcode = 'DS030';
  end if;

  for v_perfil in
    select p.id
      from public.perfil p
     where p.situacao = 'desativada'
       and p.desativada_em is not null
       and p.desativada_em <= now() - make_interval(days => v_dias)
     order by p.desativada_em
     limit p_limite
     for update skip locked
  loop
    -- Anonimiza o que identifica. `handle` vai a nulo em vez de a um valor
    -- gerado, para não ocupar um identificador público que outra pessoa possa
    -- querer.
    update public.perfil
       set nome_completo = 'Conta removida',
           nome_exibicao = null,
           handle = null,
           foto_caminho = null,
           cidade = null,
           situacao = 'excluida'
     where id = v_perfil.id;

    update public.perfil_artista
       set bio = null, generos = null,
           link_instagram = null, link_spotify = null, link_youtube = null, link_site = null,
           cobranca_nome = null, cobranca_documento = null
     where perfil_id = v_perfil.id;

    update public.perfil_curador
       set bio = null, especialidade = null, formacao = null, premios = null,
           link_participacao_disco = null,
           chave_pix = null, chave_pix_tipo = null, chave_pix_situacao = null
     where perfil_id = v_perfil.id;

    -- Novo na `0011c`: o meio de pagamento sai com a conta.
    delete from public.cartao_salvo cs
     using public.perfil_artista pa
     where pa.id = cs.perfil_artista_id and pa.perfil_id = v_perfil.id;

    -- Credenciais e mídias são conteúdo declarado pela pessoa: saem.
    delete from public.credencial_curador cc
     using public.perfil_curador pc
     where pc.id = cc.perfil_curador_id and pc.perfil_id = v_perfil.id;

    delete from public.midia_curador mc
     using public.perfil_curador pc
     where pc.id = mc.perfil_curador_id and pc.perfil_id = v_perfil.id;

    -- As notificações são histórico pessoal, e vão junto.
    delete from public.notificacao n where n.perfil_id = v_perfil.id;

    -- **Não** se apaga aqui: `lancamento_clave`, `pedido_clave`,
    -- `ganho_curador`, `avaliacao` e `log_auditoria`. Os três primeiros são
    -- retenção fiscal; a avaliação é a devolutiva que o artista pagou e que o
    -- curador tem obrigação contratual de manter (regras §10); o rastro é
    -- governança.
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$funcao$;

revoke execute on function expurgar_contas_excluidas(integer)
  from public, anon, authenticated;
