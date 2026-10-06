import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { MolduraDaClasse } from '@/componentes/curador/MolduraDaClasse';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { sair } from '@/modulos/autenticacao/acoes';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import { CURADOR_CLASSIFICACAO } from '@dissona/nucleo/textos/curador';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Cadastro em análise · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 12.5 — cadastro em análise (candidato a Prata).
 *
 * O acesso à curadoria **não** está liberado: `situacao` é `prata_em_analise`,
 * e a guarda de rota mantém a pessoa fora do painel até o admin decidir (20.3).
 * É o que a copy promete — "assim que for aprovado, você recebe um aviso por
 * e-mail e o acesso à curadoria é liberado".
 *
 * O "Entendi" do protótipo volta ao login, e aqui ele é a ação de **sair** de
 * verdade. Não há tela seguinte enquanto a análise não acontece, e deixar a
 * pessoa numa sessão sem destino seria pior — a guarda a traria de volta para
 * cá em qualquer clique.
 *
 * A tela é reencontrável: quem entra durante a análise é trazido para cá, e
 * reencontra a explicação em vez de um redirecionamento sem texto.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();
  if (estado === null) redirect(ROTA.CURADOR_ENTRAR);
  if (!estado.concluido) redirect(ROTA.CURADOR_CADASTRO);

  return (
    <MolduraDaClasse
      selo={CURADOR_CLASSIFICACAO.seloAnalise}
      titulo={CURADOR_CLASSIFICACAO.analiseTitulo}
      texto={CURADOR_CLASSIFICACAO.analiseTexto}
      tom="analise"
    >
      <Aviso tom="info" estatico>
        {CURADOR_CLASSIFICACAO.analiseNota}
      </Aviso>

      <form action={sair} className={estilos.formulario}>
        <Botao type="submit" tamanho="denso" blocoInteiro>
          {CURADOR_CLASSIFICACAO.entendi}
        </Botao>
      </form>
    </MolduraDaClasse>
  );
}
