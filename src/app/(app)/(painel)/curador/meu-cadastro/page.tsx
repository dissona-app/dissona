import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CartaoDaClasse } from '@/componentes/curador/CartaoDaClasse';
import { FormularioDeServicos } from '@/componentes/curador/FormularioDeServicos';
import { TabelaDeMidias } from '@/componentes/curador/TabelaDeMidias';
import { ROTA } from '@/lib/guarda-rota';
import {
  removerMidiaDoCurador,
  salvarMidiaDoCurador,
  salvarServicosNaManutencao,
} from '@/modulos/curador/acoes';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Meu cadastro · Dissona',
  robots: { index: false, follow: false },
};

/**
 * 12.6 — alteração de cadastro e mídias.
 *
 * A tela de **manutenção** do que o wizard definiu: acrescentar uma playlist,
 * corrigir um link, mexer nos preços. Ela entrou na V3.1 do discovery e não
 * existe no protótipo — o conteúdo vem do PRD §12.6, e a forma reaproveita os
 * cards e a lista de serviços do módulo 12.
 *
 * Rota própria, e não `/curador/cadastro`: aquela é a retomada do wizard e
 * manda quem já concluiu para a classificação, o que faria "Meu cadastro" na
 * sidebar abrir a tela de parabéns do Bronze.
 *
 * Cadastro pendente volta ao wizard. É a mesma decisão que o serviço toma nas
 * três escritas (`paraManutencao`), repetida aqui porque a guarda de rota manda
 * pelo `cadastroCuradorConcluido` da sessão e esta página lê o estado real —
 * são duas fontes, e a que decide o que renderizar é esta.
 *
 * Sem `<h1>`: o `Shell` já põe o da rota.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();

  if (estado === null) redirect(ROTA.ENTRAR);
  if (!estado.concluido) redirect(ROTA.CURADOR_CADASTRO);

  return (
    <div className={estilos.base}>
      <CartaoDaClasse classe={estado.classe} situacao={estado.situacaoCurador} />

      <TabelaDeMidias
        midias={estado.canais}
        acaoDeSalvar={salvarMidiaDoCurador}
        acaoDeExcluir={removerMidiaDoCurador}
      />

      <FormularioDeServicos servicos={estado.servicos} acao={salvarServicosNaManutencao} />
    </div>
  );
}
