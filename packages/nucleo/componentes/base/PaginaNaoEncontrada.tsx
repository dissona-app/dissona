import { BotaoLink } from './BotaoLink';
import estilos from './PaginaNaoEncontrada.module.css';

export type PropsPaginaNaoEncontrada = {
  /** Para onde "Voltar ao início" leva — a raiz do app em que a página está. */
  readonly hrefDoInicio: string;
};

/**
 * A página 404 dos dois apps — o `not-found.tsx` da raiz de cada um.
 *
 * Serve aos dois casos em que o Next a mostra: endereço que não existe (aí
 * ela aparece sozinha, sem o shell) e `notFound()` dentro de uma tela (aí ela
 * aparece no miolo, com a sidebar em volta). Por isso não traz marca nem
 * moldura própria: o que estiver em volta já é a identidade da página.
 *
 * Substitui a 404 padrão do Next, que era em inglês.
 */
export function PaginaNaoEncontrada({ hrefDoInicio }: PropsPaginaNaoEncontrada) {
  return (
    <div className={estilos.base}>
      <title>Página não encontrada · Dissona</title>
      <p className={estilos.codigo} aria-hidden="true">
        404
      </p>
      <h1 className={estilos.titulo}>Página não encontrada</h1>
      <p className={estilos.descricao}>
        O endereço pode estar errado, ou o conteúdo não existe mais.
      </p>
      <BotaoLink href={hrefDoInicio}>Voltar ao início</BotaoLink>
    </div>
  );
}
