-- ============================================================================
-- 0011 · Jobs agendados  (R1 + R2)
--
-- `expurgar_contas_excluidas()` e os `cron.schedule` dos três jobs.
--
-- Exige emendar data-model §11, que reserva `0011+` para a R3: a faixa passa a
-- ser `0011` = jobs de R1 e R2, e `0012+` = R3. A alternativa, um `0000d`,
-- sugeriria execução antes da `0001`, o que é falso — o expurgo depende do
-- grafo de FK inteiro.
--
-- **Regra de quando é SQL e quando é Edge Function** (architecture §7 diz
-- "pg_cron agenda e Edge Functions executam", e isto refina):
-- `pg_cron` chama SQL direto quando todo o efeito do job está dentro do banco;
-- `pg_net` → Edge Function apenas quando o job tem efeito **fora** dele. Os
-- dois jobs de SLA são puramente SQL — levá-los para uma Edge Function
-- moveria a fronteira de transação do ledger para fora do banco, que é
-- exatamente o que a exigência de RPC atômica evita.
--
-- ⚠️ LGPD × retenção fiscal. A política publicada em `/privacidade` promete
-- apagar em 30 dias, mas `lancamento_clave` é append-only e `pedido_clave` e
-- `ganho_curador` têm retenção fiscal. Apagar em cascata destruiria a
-- conciliação; não apagar descumpre a política. Este job **anonimiza**: zera o
-- que identifica a pessoa e preserva as linhas financeiras. É a leitura que
-- atende às duas obrigações, e é **decisão de jurídico** — está registrada
-- aqui, não decidida aqui.
-- ============================================================================

-- ------------------------------------------------- expurgar_contas_excluidas

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

comment on function expurgar_contas_excluidas(integer) is
  'Job diario da LGPD. ANONIMIZA em vez de apagar: as linhas financeiras e a devolutiva ja paga sobrevivem por retencao fiscal e obrigacao contratual (regras 10). Os objetos de Storage sao apagados pela Edge Function que chama esta funcao.';

revoke execute on function expurgar_contas_excluidas(integer)
  from public, anon, authenticated;

-- ------------------------------------------------------------- agendamento

-- `pg_cron` roda no database `postgres` como `postgres`, então os jobs são
-- `bypassrls` — o comportamento desejado para varredura de sistema.
--
-- Os horários são UTC. O expurgo às 03:30 UTC é 00:30 em São Paulo, fora da
-- janela de uso.
--
-- `cron.schedule` com o mesmo `jobname` substitui o agendamento anterior, o
-- que torna esta migration reaplicável sem duplicar jobs.

select cron.schedule(
  'avisar_prazo_72h',
  '0 * * * *',
  $cron$select public.avisar_prazo_72h();$cron$
);

select cron.schedule(
  'devolver_claves_sem_resposta',
  -- 15 minutos depois do aviso: os dois varrem o mesmo índice de `envio`, e
  -- separá-los evita contenção sem custo nenhum.
  '15 * * * *',
  $cron$select public.devolver_claves_sem_resposta();$cron$
);

-- O expurgo é o único com efeito **fora** do banco: precisa apagar objetos de
-- `avatares`, `faixas` e `exportacoes`, e SQL não fala com a Storage API.
--
-- Enquanto a Edge Function `expurgar-contas` não existe, o job roda só a parte
-- SQL — a anonimização, que é a obrigação legal — e os objetos de Storage
-- ficam para ela. Registrado como pendência da fatia de conta e configurações,
-- e é o primeiro ponto do projeto que exige de fato a service role key.
select cron.schedule(
  'expurgar_contas_excluidas',
  '30 3 * * *',
  $cron$select public.expurgar_contas_excluidas();$cron$
);
