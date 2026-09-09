import { EstadoVazio } from '@/componentes/base/EstadoVazio';

/** Dashboard do artista — módulo 2, R4. Sem `<h1>`: o `Shell` já tem o da rota. */
export default function Pagina() {
  return (
    <EstadoVazio
      titulo="O painel do artista entra na Release 4"
      descricao="A Carteira e o envio de música entram na Release 2."
    />
  );
}
