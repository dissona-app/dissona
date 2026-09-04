-- =============================================================================
-- 0000_storage — Buckets de Storage e policies
--
-- Versao 20260904171821: o prefixo do nome do arquivo TEM de bater com a
-- versao registrada em `supabase_migrations`, senao a CLI reaplica o que o
-- MCP ja aplicou. Ver architecture.md 2.4.
--
-- Nomes de policy sem acento de proposito: e o identificador exatamente como
-- foi aplicado no banco. Divergir aqui faria `db reset` criar policy com
-- outro nome, e a de producao ficaria orfa.
--
-- Fora da faixa 0001–0010, que está reservada por release (data-model.md §11).
-- Buckets não são schema de produto: existem desde a R0 para que o upload de
-- faixa (R2) e a exportação LGPD (R1) tenham onde escrever.
--
-- Ver architecture.md §6.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
--
-- `file_size_limit` e `allowed_mime_types` são defesa em profundidade na
-- infraestrutura. O número de negócio continua em `configuracao`
-- (`upload.tamanho_max_mb`, `upload.formatos`); estes valores existem para que
-- um bug de validação na aplicação não vire upload de 2 GB.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'faixas',
    'faixas',
    false,
    52428800, -- 50 MB
    array['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3']
  ),
  (
    'capas',
    'capas',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'avatares',
    'avatares',
    true,
    2097152, -- 2 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'materiais',
    'materiais',
    false,
    20971520, -- 20 MB
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
  ),
  (
    'exportacoes',
    'exportacoes',
    false,
    104857600, -- 100 MB
    array['application/zip']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Convenção de caminho
--
-- Todo objeto vive sob a pasta do dono: `<uid>/<resto>`. As policies abaixo
-- comparam `storage.foldername(name)[1]` com `auth.uid()`, o que dá isolamento
-- por usuário sem depender de nenhuma tabela do produto — importante, porque
-- `perfil` e `envio` só nascem na R1 e na R2.
-- -----------------------------------------------------------------------------

-- --------------------------------------------------------------------- faixas

-- O artista escreve, lê, atualiza e remove apenas dentro da própria pasta.
create policy "faixas: dono gerencia a propria pasta"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'faixas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'faixas' and (storage.foldername(name))[1] = auth.uid()::text);

-- PENDENTE R2 — leitura pelo curador com `envio` ativo daquela faixa.
-- Não pode ser escrita agora: `envio` e `faixa` nascem na migration 0006.
-- Forma esperada:
--
-- create policy "faixas: curador com envio ativo lê"
--   on storage.objects for select
--   to authenticated
--   using (
--     bucket_id = 'faixas'
--     and exists (
--       select 1
--         from envio e
--         join faixa f on f.id = e.faixa_id
--        where f.arquivo_caminho = storage.objects.name
--          and e.curador_id = auth.uid()
--          and e.situacao in ('recebeu', 'ouviu', 'avaliando')
--     )
--   );
--
-- Depende também da pendência #7 (armazenar o mp3 sempre ou só fora do
-- streaming), que decide se `faixa.arquivo_caminho` é sempre preenchido.

-- ---------------------------------------------------------------------- capas

create policy "capas: leitura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'capas');

create policy "capas: dono gerencia a propria pasta"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------------- avatares

create policy "avatares: leitura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'avatares');

create policy "avatares: dono gerencia a propria pasta"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------------ materiais

create policy "materiais: dono gerencia a propria pasta"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'materiais' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materiais' and (storage.foldername(name))[1] = auth.uid()::text);

-- PENDENTE R4 — leitura pelo curador destinatário da matéria (módulo 22).
-- Depende de `material_materia`, que é da migration 0011+.

-- ---------------------------------------------------------------- exportacoes

-- Só leitura pelo dono. A escrita é do job de exportação LGPD, que roda com
-- service role e por isso não passa por policy.
create policy "exportacoes: dono le a propria pasta"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'exportacoes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "exportacoes: dono remove a propria pasta"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'exportacoes' and (storage.foldername(name))[1] = auth.uid()::text);
