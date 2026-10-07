import { CarregandoConteudo } from '@dissona/nucleo/componentes/shell/CarregandoConteudo';

/**
 * Entrada no ambiente (o login leva aqui): o shell fica, e o miolo mostra o
 * esqueleto enquanto a rota dinâmica responde.
 */
export default function Carregando() {
  return <CarregandoConteudo />;
}
