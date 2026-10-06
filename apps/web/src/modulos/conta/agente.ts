/**
 * `user_agent` → "Chrome · Windows".
 *
 * O protótipo escreve "Chrome · São Paulo", e `auth.sessions` não guarda
 * cidade — guarda `ip` e `user_agent`. Resolver o IP em cidade exigiria um
 * serviço externo por linha da lista, e um "São Paulo" errado num painel cuja
 * função é reconhecer acesso indevido é pior que nenhum lugar (ver o cabeçalho
 * da migration `0001d`). Então o segundo termo passa a ser o **sistema**, que é
 * a outra coisa que a pessoa reconhece de bater o olho.
 *
 * ## Por que uma tabela de substrings, e não uma biblioteca
 *
 * Parsear `user_agent` de verdade é um problema sem fim — a string é folclore
 * histórico, e toda biblioteca que o faz bem tem uma base de dados que precisa
 * de atualização. Aqui o requisito é outro: **a pessoa reconhecer a própria
 * sessão**. Para isso basta o navegador e o sistema, e errar significa mostrar
 * "Navegador desconhecido", não vazar nada.
 *
 * A ordem das tabelas importa e é o que faz o resultado certo: Edge e Opera
 * escrevem "Chrome" na própria string, Chrome escreve "Safari", e o Safari de
 * verdade é o único que escreve "Safari" sem escrever "Chrome". Quem casa
 * primeiro vence, então o mais específico vem antes.
 */

/** Substring → nome, do mais específico para o mais genérico. */
const NAVEGADORES: readonly (readonly [string, string])[] = [
  ['Edg/', 'Edge'],
  ['OPR/', 'Opera'],
  ['SamsungBrowser', 'Samsung Internet'],
  ['Firefox/', 'Firefox'],
  ['Chrome/', 'Chrome'],
  ['Safari/', 'Safari'],
];

const SISTEMAS: readonly (readonly [string, string])[] = [
  // iPhone e iPad antes de "Mac OS": o iPad se anuncia como Macintosh desde o
  // iPadOS 13, e o iPhone traz "like Mac OS X" na string.
  ['iPhone', 'iPhone'],
  ['iPad', 'iPad'],
  ['Android', 'Android'],
  ['Windows', 'Windows'],
  ['Macintosh', 'macOS'],
  ['Mac OS', 'macOS'],
  ['CrOS', 'ChromeOS'],
  ['Linux', 'Linux'],
];

export type DispositivoDaSessao = {
  readonly navegador: string | null;
  readonly sistema: string | null;
};

export function lerDispositivo(agente: string | null): DispositivoDaSessao {
  if (agente === null || agente.trim() === '') return { navegador: null, sistema: null };

  return {
    navegador: primeiroQueCasa(agente, NAVEGADORES),
    sistema: primeiroQueCasa(agente, SISTEMAS),
  };
}

function primeiroQueCasa(
  agente: string,
  tabela: readonly (readonly [string, string])[],
): string | null {
  for (const [marca, nome] of tabela) {
    if (agente.includes(marca)) return nome;
  }
  return null;
}
