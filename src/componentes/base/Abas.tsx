import Link from 'next/link';

import estilos from './Abas.module.css';

export type Aba = {
  /** Valor que viaja na URL. */
  readonly chave: string;
  readonly rotulo: string;
};

export type PropsAbas = {
  readonly abas: readonly Aba[];
  readonly ativa: string;
  /** Caminho base. A aba vira `?<parametro>=<chave>`. */
  readonly caminho: string;
  /** Nome do parâmetro de busca. `aba` por padrão. */
  readonly parametro?: string;
  /** Rótulo do grupo para leitor de tela. */
  readonly rotulo: string;
};

/**
 * Abas sublinhadas (design-system.md §2.1.4).
 *
 * ## Por que links, e não `role="tablist"`
 *
 * No protótipo as abas são `<button>` com estado local — e o Design System
 * registra que só o ambiente do artista tem `role="tablist"`, os outros dois
 * são `<button>` sem semântica nenhuma (§4.6). Aqui elas são **links** que
 * trocam `?aba=`, por três razões que valem mais que a fidelidade de
 * implementação (a aparência é idêntica):
 *
 *  1. **A aba passa a ter endereço.** "Gere outro em Configurações › Segurança"
 *     é uma frase que a própria copy usa; sem URL, ela não é linkável.
 *  2. **Funciona sem JavaScript**, como o resto das telas desta fatia.
 *  3. **O servidor renderiza só a aba ativa.** Com estado local, a lista de
 *     sessões teria de ser buscada para quem abriu a tela em "Dados da conta" e
 *     talvez nunca vá a "Segurança".
 *
 * Sendo navegação de verdade, o padrão acessível é `<a>` com
 * `aria-current="page"` — e não `role="tab"`, que promete ao leitor de tela um
 * painel que troca no lugar, sem sair da página.
 */
export function Abas({ abas, ativa, caminho, parametro = 'aba', rotulo }: PropsAbas) {
  return (
    <nav className={estilos.base} aria-label={rotulo}>
      {abas.map((aba) => {
        const atual = aba.chave === ativa;
        return (
          <Link
            key={aba.chave}
            href={`${caminho}?${parametro}=${aba.chave}`}
            className={[estilos.aba, atual ? estilos.ativa : undefined].filter(Boolean).join(' ')}
            aria-current={atual ? 'page' : undefined}
            // A aba ativa continua focável — tirá-la da ordem de tabulação
            // esconderia de quem navega por teclado qual delas está aberta.
            scroll={false}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
