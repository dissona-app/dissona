import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { PAINEIS } from '@dissona/nucleo/textos/prototipo';

/**
 * Dashboard administrativo — módulo 24, R4.
 *
 * **Sem `<h1>` próprio.** O `Shell` já renderiza o da rota, e o desta página
 * era um segundo `<h1>` na mesma tela — dois cabeçalhos de nível 1 quebram a
 * estrutura de headings, que é como quem usa leitor de tela navega
 * (design-system.md §4.6). O defeito nasceu ao mover o título para o `Shell` e
 * só apareceu olhando a tela.
 */
export default function Pagina() {
  return <EstadoVazio titulo={PAINEIS.admin.vazio} descricao={PAINEIS.admin.descricao} />;
}
