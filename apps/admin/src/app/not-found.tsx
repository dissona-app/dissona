import { PaginaNaoEncontrada } from '@dissona/nucleo/componentes/base/PaginaNaoEncontrada';

/**
 * 404 em português: endereço inexistente e `notFound()` de qualquer tela.
 */
export default function NaoEncontrada() {
  return <PaginaNaoEncontrada hrefDoInicio="/" />;
}
