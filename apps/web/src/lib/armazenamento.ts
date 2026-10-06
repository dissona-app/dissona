/**
 * Regra de caminho do Storage — **pura**, sem Supabase e sem `server-only`.
 *
 * Mora em `lib/` porque dois módulos dependem dela: o envio de faixa (módulo 3)
 * e o cadastro do curador (módulo 12), os dois desde que o arquivo passou a
 * subir do navegador direto ao bucket. Duplicá-la seria duplicar uma conferência
 * de dono, que é a última coisa que se quer em duas cópias.
 */

/**
 * O caminho está sob a pasta da própria pessoa?
 *
 * As policies de `0000_storage` já exigem
 * `(storage.foldername(name))[1] = auth.uid()::text`, então um caminho alheio
 * não seria sequer legível. Isto é a segunda tranca, e ela é barata: sem ela a
 * ação gravaria numa coluna (`faixa.arquivo_caminho`, `perfil.foto_caminho`,
 * `credencial_curador.anexo_caminho`) uma string arbitrária vinda do formulário.
 *
 * Vale **antes** de qualquer leitura do Storage, nunca depois: é o que garante
 * que nem se tente ler a pasta de outra pessoa.
 *
 * A segunda condição recusa subpasta. `<uid>/a/b.pdf` passaria no teste de
 * prefixo e é um caminho que nenhum código nosso monta — aceitar o que não se
 * escreve é convite para alguém descobrir o que mais passa.
 */
export function caminhoEhDoUsuario(caminho: string, usuarioId: string): boolean {
  const prefixo = `${usuarioId}/`;
  if (!caminho.startsWith(prefixo)) return false;
  return !caminho.slice(prefixo.length).includes('/');
}
