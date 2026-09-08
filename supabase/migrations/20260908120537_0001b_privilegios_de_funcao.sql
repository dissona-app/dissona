-- ============================================================================
-- 0001b · Privilégios de execução das funções
--
-- Corrige uma lacuna da 0001, apontada por `get_advisors(security)`:
-- `criar_perfil_para_novo_usuario` e `atualizar_atualizado_em` ficaram
-- executáveis por `anon` e `authenticated`, e portanto expostas em
-- `/rest/v1/rpc/...`.
--
-- A causa é uma pegadinha do Supabase que vale para TODA função deste projeto:
--
--     revoke execute on function f() from public;
--
-- NÃO basta. O Supabase mantém `alter default privileges ... grant execute on
-- functions to anon, authenticated, service_role`, e esses grants são feitos
-- **aos papéis**, não a PUBLIC. Revogar de PUBLIC remove a entrada `=X`, e
-- deixa `anon=X` e `authenticated=X` intactas. É preciso revogar de cada papel
-- por nome.
--
-- Regra para as migrations seguintes: toda função nasce revogada de `anon` e
-- de `authenticated`, e só então recebe o `grant` de quem precisa mesmo dela.
-- ============================================================================

-- Funções de trigger. Não têm por que estar na superfície REST: chamá-las
-- direto sequer funciona (o Postgres recusa uma função de trigger fora de um
-- trigger), mas uma função `security definer` acessível sem sessão é ruído no
-- relatório de segurança e superfície desnecessária.
revoke execute on function criar_perfil_para_novo_usuario() from public, anon, authenticated;
revoke execute on function atualizar_atualizado_em() from public, anon, authenticated;

-- Helpers de RLS. `authenticated` **precisa** poder executá-los: são chamados
-- de dentro das policies, e a checagem no serviço (3ª camada de
-- architecture §5.2) também os usa. `anon` não — sem sessão, `auth.uid()` é
-- nulo e a resposta seria sempre `false`; manter o acesso só ampliaria a
-- superfície da API pública.
revoke execute on function tem_papel(papel) from anon;
revoke execute on function e_admin() from anon;
