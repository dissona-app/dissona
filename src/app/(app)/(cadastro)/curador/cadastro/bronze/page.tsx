import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BotaoLink } from '@/componentes/base/BotaoLink';
import { MolduraDaClasse } from '@/componentes/curador/MolduraDaClasse';
import { ROTA } from '@/lib/guarda-rota';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import { seriaCandidatoAPrata } from '@/modulos/curador/tipos';
import { CURADOR_CLASSIFICACAO } from '@/textos/curador';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Boas-vindas à curadoria · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 12.5 — Bronze aprovado.
 *
 * "Auto-aprovado, acesso liberado na hora": a `situacao` já é
 * `bronze_aprovado` quando esta tela abre, e por isso o "Ir para o painel"
 * funciona de verdade — a guarda de rota não barra mais.
 *
 * O curso de curadoria é **opcional** e aparece com os três módulos, títulos,
 * descrições e durações do protótipo. "Começar o curso" ainda não tem para onde
 * ir — o conteúdo dele não é da R1 nem da R2 —, então o botão fica desabilitado
 * com o motivo no `title`, na mesma decisão dos provedores sociais e da
 * navegação por release: mostrar o que o produto oferece, sem prometer o que ele
 * ainda não faz.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();
  if (estado === null) redirect(ROTA.ENTRAR);
  if (!estado.concluido) redirect(ROTA.CURADOR_CADASTRO);

  // Candidato a Prata não passa por aqui: a tela dele é a de análise, e o
  // acesso ao painel ainda não está liberado.
  if (seriaCandidatoAPrata(estado)) redirect(ROTA.CURADOR_CADASTRO_ANALISE);

  const primeiroNome = estado.nome.split(/\s+/)[0] ?? '';

  return (
    <MolduraDaClasse
      selo={CURADOR_CLASSIFICACAO.seloBronze}
      titulo={CURADOR_CLASSIFICACAO.boasVindas(primeiroNome)}
      texto={CURADOR_CLASSIFICACAO.boasVindasTexto}
      tom="bronze"
    >
      <div className={estilos.curso}>
        <div className={estilos.cursoCabecalho}>
          <span className={estilos.cursoTitulo}>{CURADOR_CLASSIFICACAO.cursoTitulo}</span>
          <span className={estilos.cursoResumo}>{CURADOR_CLASSIFICACAO.cursoResumo}</span>
          <span className={estilos.cursoSelo}>{CURADOR_CLASSIFICACAO.cursoOpcional}</span>
        </div>

        <ol className={estilos.modulos}>
          {CURADOR_CLASSIFICACAO.cursoModulos.map((modulo) => (
            <li key={modulo.numero} className={estilos.modulo}>
              <span className={estilos.moduloNumero} aria-hidden="true">
                {modulo.numero}
              </span>
              <span className={estilos.moduloTextos}>
                <span className={estilos.moduloTitulo}>{modulo.titulo}</span>
                <span className={estilos.moduloDescricao}>{modulo.descricao}</span>
              </span>
              <span className={estilos.moduloDuracao}>{modulo.duracao}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={estilos.acoes}>
        <button
          type="button"
          className={estilos.cursoBotao}
          disabled
          title="O curso de curadoria é conteúdo do cliente e entra numa release própria"
        >
          {CURADOR_CLASSIFICACAO.comecarCurso}
        </button>

        <BotaoLink href={ROTA.CURADOR} blocoInteiro>
          {CURADOR_CLASSIFICACAO.irAoPainel}
        </BotaoLink>
      </div>
    </MolduraDaClasse>
  );
}
