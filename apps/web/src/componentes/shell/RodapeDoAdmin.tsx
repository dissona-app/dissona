import { ADMIN_NAVEGACAO } from '@/textos/prototipo';

import estilos from './Navegacao.module.css';

/**
 * A faixa "Ambiente administrativo" no pé da sidebar — só o admin tem.
 *
 * Ocupa o mesmo slot `rodape` da `Navegacao` que o `CartaoDeSaldo` ocupa no
 * ambiente do artista; o curador não passa nada, e o pé fica vazio. É assim nos
 * três protótipos.
 *
 * A copy (`ADMIN_NAVEGACAO.rodape`) existia em `textos/prototipo.ts` desde a
 * portabilidade da navegação e **nunca tinha sido renderizada** — faltava o
 * elemento, não o texto.
 *
 * O ponto roxo é `aria-hidden`: é marcador visual, e lê-lo daria "marcador
 * ambiente administrativo" ao leitor de tela.
 */
export function RodapeDoAdmin() {
  return (
    <p className={estilos.faixaDeAmbiente}>
      <span className={estilos.pontoDeAmbiente} aria-hidden="true" />
      {ADMIN_NAVEGACAO.rodape}
    </p>
  );
}
