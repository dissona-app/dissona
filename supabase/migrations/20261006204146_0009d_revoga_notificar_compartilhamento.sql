-- ============================================================================
-- 0009d · `notificar_compartilhamento` sem `execute` para ninguém
--
-- A `0009c` criou a função de trigger e esqueceu a revogação que a `0001b`
-- estabeleceu para toda função de trigger `security definer`: no Supabase o
-- `execute` vem concedido a `anon` e `authenticated` por default privileges, e
-- `revoke from public` sozinho não basta.
--
-- Chamada direta por `/rest/v1/rpc/notificar_compartilhamento` falha de
-- qualquer forma — função `returns trigger` não roda fora de trigger —, então
-- não havia furo explorável. O que esta migration fecha é o aviso do advisor
-- (`anon_security_definer_function_executable`) e a divergência com a regra.
-- O trigger continua disparando: ele roda com o privilégio do dono, e não com o
-- de quem atualizou a linha.
-- ============================================================================

revoke execute on function notificar_compartilhamento() from public, anon, authenticated;
