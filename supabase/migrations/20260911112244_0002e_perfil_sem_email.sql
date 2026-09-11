-- ============================================================================
-- 0002e · O perfil nasce sem e-mail  (R1)
--
-- O `coalesce` da `0001` tem dois degraus: a nossa chave `nome_completo` e,
-- se ela faltar, o **e-mail**. Os dois desaparecem no login por SoundCloud.
--
--     coalesce(nullif(btrim(raw_user_meta_data ->> 'nome_completo'), ''), email)
--                                                                        ^^^^^
--                                                                        NULL
--
-- `nome_completo` é chave nossa, gravada por `criarConta` no cadastro por
-- e-mail — nenhum provedor social a manda. E o SoundCloud não devolve e-mail:
-- o `/me` deles tem `primary_email_confirmed`, que é um booleano, e nada mais
-- (open-questions #9). Com os dois degraus nulos, o `coalesce` resolve para
-- NULL, o `not null` de `perfil.nome_completo` estoura **dentro do trigger**, e
-- o cabeçalho da própria função da `0001` diz o que isso significa: "uma
-- exceção aqui derruba o cadastro inteiro". Não nasceria nem a conta do Auth.
--
-- ## O que entra no lugar
--
-- Os degraus do meio são as chaves que o GoTrue grava a partir da struct
-- `Claims` dele — `full_name`, `name` e `preferred_username`. São o que a Edge
-- Function `soundcloud-userinfo` emite ao traduzir o `/me`, e também o que
-- Google e Facebook já mandam hoje.
--
-- ## O efeito colateral é uma correção
--
-- Hoje, quem entra por Google recebe `perfil.nome_completo = '<e-mail dele>'`,
-- porque a chave `nome_completo` não vem de provedor nenhum e o degrau
-- seguinte era o endereço. Com `full_name` antes do e-mail, passa a receber o
-- nome. A tela `/cadastrar/confirmar` sobrescreve logo em seguida, então isto
-- não muda o que a pessoa vê — muda o que fica gravado se ela abandonar o
-- fluxo no meio.
--
-- ## Por que não relaxar o `not null`
--
-- Porque `nome_completo` é exibido em listagem de admin, em card de curador e
-- no menu da conta, e nenhum desses lugares trata nulo. O último degrau é um
-- literal justamente para que a coluna continue tendo a garantia que o resto
-- do schema assume. Ele é invisível na prática: a guarda de rota prende quem
-- não aceitou os termos em `/cadastrar/confirmar`, e é lá que o nome real é
-- gravado, antes de qualquer tela que leia a coluna.
--
-- ## Por que uma migration nova
--
-- Mesma razão da `0003c` e da `0003e`: a `0001` já está aplicada, e o arquivo
-- dela tem de continuar batendo byte a byte com o que rodou.
-- ============================================================================

create or replace function criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  insert into public.perfil (id, nome_completo, aceite_termos_em)
  values (
    new.id,
    -- Ordem: a nossa chave, o que os provedores mandam, o e-mail, e um literal
    -- que só existe para o `not null` nunca estourar aqui dentro.
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome_completo'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
      nullif(btrim(new.email), ''),
      'Conta sem nome'
    ),
    case
      when (new.raw_user_meta_data ->> 'aceite_termos') = 'true' then now()
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$funcao$;

comment on function criar_perfil_para_novo_usuario() is
  'Trigger em auth.users: cria a linha de perfil. RF-003 e RF-010. Sobrevive a conta sem e-mail (0002e).';
