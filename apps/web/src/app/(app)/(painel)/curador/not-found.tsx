import { PaginaNaoEncontrada } from '@dissona/nucleo/componentes/base/PaginaNaoEncontrada';

/**
 * 404 dentro do ambiente: sem este arquivo o `notFound()` de uma tela subiria
 * até o `not-found.tsx` da raiz e a página perderia a sidebar.
 */
export default function NaoEncontrada() {
  return <PaginaNaoEncontrada hrefDoInicio="/curador" />;
}
