import { EstadoVazio } from '@/componentes/base/EstadoVazio';

/** Fila de avaliações — módulo 13, R2. Sem `<h1>`: o `Shell` já tem o da rota. */
export default function Pagina() {
  return (
    <EstadoVazio
      titulo="A fila de avaliações entra na Release 2"
      descricao="Quando um artista selecionar você, os envios aparecem aqui."
    />
  );
}
