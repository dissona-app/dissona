-- ============================================================================
-- 0011b · O expurgo passa a chamar a Edge Function
--
-- A `0011` agendou `expurgar_contas_excluidas()` em SQL puro e deixou escrito
-- que os **objetos de Storage** ficavam para uma Edge Function que ainda não
-- existia. Ela existe agora (`supabase/functions/expurgar-contas`), e este
-- agendamento a coloca no lugar do `select` direto.
--
-- A regra da `0011` continua valendo, e é o que decide quem chama o quê:
-- `pg_cron` roda SQL direto quando todo o efeito do job está dentro do banco;
-- `pg_net` → Edge Function quando o job tem efeito **fora** dele. Os dois jobs
-- de SLA seguem SQL puro. O expurgo é o único que sai do banco — e ele deixou
-- de rodar a RPC daqui porque a **ordem importa**: os objetos têm de sair
-- antes da anonimização, senão não há mais como saber de quem eram. Quem
-- chama a RPC agora é a própria função, depois de limpar o Storage.
--
-- ## A credencial, e por que o job degrada em vez de parar
--
-- A Edge Function se autentica pela **service role key**, que ela já tem no
-- ambiente. O cron a apresenta a partir do Vault, e ela é criada à mão, uma
-- vez — está na lista de pendências manuais do BACKLOG:
--
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- `url_do_projeto` já existe e não é segredo: é a URL pública do projeto.
--
-- ⚠️ Enquanto `service_role_key` não existir, este job **não fica sem fazer
-- nada**: ele cai no `select public.expurgar_contas_excluidas()` da `0011`.
-- A razão é que a anonimização é a obrigação legal e já funciona — substituí-la
-- por uma chamada que erra 401 todas as noites seria trocar um problema
-- (objetos de Storage acumulando) por um pior (nenhuma anonimização). Com o
-- segredo no lugar, o `case` passa a chamar a função e o expurgo fica completo.
--
-- `cron.schedule` com o mesmo `jobname` substitui o anterior, então esta
-- migration é reaplicável e não duplica o job.
-- ============================================================================

select cron.schedule(
  'expurgar_contas_excluidas',
  -- Mesmo horário da 0011: 03:30 UTC = 00:30 em São Paulo, fora da janela de
  -- uso. O que muda é o que roda, não quando.
  '30 3 * * *',
  $cron$
  select case
    when exists (select 1 from vault.decrypted_secrets where name = 'service_role_key')
    then (
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_do_projeto')
               || '/functions/v1/expurgar-contas',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          -- A mesma chave que a função tem no ambiente: é a comparação dela
          -- que separa "veio do projeto" de "veio do cron".
          'Authorization',
          'Bearer '
            || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )::text
    )
    -- Sem o segredo: a anonimização da `0011`, como antes. Os objetos de
    -- Storage esperam, e a obrigação legal segue cumprida.
    else (select public.expurgar_contas_excluidas()::text)
  end;
  $cron$
);

comment on function expurgar_contas_excluidas(integer) is
  'Job diario da LGPD. ANONIMIZA em vez de apagar: as linhas financeiras e a devolutiva ja paga sobrevivem por retencao fiscal e obrigacao contratual (regras 10). Chamada pela Edge Function expurgar-contas, DEPOIS de ela apagar os objetos de Storage da conta — a ordem importa, ver 0011b.';
