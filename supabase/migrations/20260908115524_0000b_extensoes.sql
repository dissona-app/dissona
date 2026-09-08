-- ============================================================================
-- 0000b · Extensões
--
-- Fora da faixa 0001-0010, que está reservada por release (data-model §11).
-- Extensão é infraestrutura, não schema de produto — mesma categoria dos
-- buckets de `0000_storage`, e por isso o mesmo prefixo `0000`.
--
-- Precisa vir antes de 0001: `perfil.handle` e `convite_admin.email` são
-- `citext`, e o tipo tem de existir para o DDL daquelas tabelas compilar.
-- ============================================================================

-- `citext` — identificador público e e-mail comparados sem diferenciar caixa.
-- Vai para o schema `extensions`, que é a convenção do Supabase. Consequência
-- que atravessa este projeto: toda função com `search_path` restrito precisa
-- qualificar o tipo, senão não resolve em tempo de execução.
create extension if not exists citext with schema extensions;

-- `pg_cron` — agenda os jobs de SLA e de LGPD (architecture §7). No Supabase a
-- extensão se registra em `pg_catalog`, mas seus objetos (`cron.job`,
-- `cron.job_run_details`) ficam no schema `cron`; por isso não se passa
-- `with schema` aqui. Roda no database `postgres`, como `postgres`, então os
-- jobs são `bypassrls` — o comportamento desejado para varredura de sistema.
--
-- Fica ocioso até a migration 0011, que é onde os `cron.schedule` entram.
-- Habilitar agora evita uma segunda migration de infra no meio do produto.
create extension if not exists pg_cron;

-- `pg_net` — HTTP assíncrono, para o único job com efeito fora do banco
-- (`expurgar_contas_excluidas`, que precisa apagar objetos do Storage). Os
-- outros dois jobs chamam SQL direto e não passam por aqui.
create extension if not exists pg_net with schema extensions;
