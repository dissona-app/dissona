import { CarregandoConteudo } from '@dissona/nucleo/componentes/shell/CarregandoConteudo';

/**
 * Um `loading.tsx` por módulo, e não só na raiz do ambiente: entre módulos
 * irmãos o React mantém a tela anterior até a nova chegar, e só uma fronteira
 * própria do módulo mostra o esqueleto no clique.
 */
export default function Carregando() {
  return <CarregandoConteudo />;
}
