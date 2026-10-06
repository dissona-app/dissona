import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { PAINEIS } from '@dissona/nucleo/textos/prototipo';

/** Dashboard do artista — módulo 2, R4. Sem `<h1>`: o `Shell` já tem o da rota. */
export default function Pagina() {
  return <EstadoVazio titulo={PAINEIS.artista.vazio} descricao={PAINEIS.artista.descricao} />;
}
