import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { PAINEIS } from '@dissona/nucleo/textos/prototipo';

/** Painel do curador — módulo de R4. Sem `<h1>`: o `Shell` já tem o da rota. */
export default function Pagina() {
  return <EstadoVazio titulo={PAINEIS.curador.vazio} descricao={PAINEIS.curador.descricao} />;
}
