'use client';

import Link from 'next/link';

import { Aviso } from '@/componentes/base/Aviso';
import { ROTA } from '@/lib/guarda-rota';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { credenciaisComprovadas, rotuloDoTempo } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  servico_feedback_obrigatorio: CURADOR_CADASTRO.erroPrecoFeedback,
};

type Bloco = {
  readonly rotulo: string;
  readonly resumo: string;
  readonly completo: boolean;
  readonly opcional: boolean;
  readonly passo: number;
};

/**
 * Passo 8 — revisão e envio.
 *
 * Sete blocos com resumo, status e "Editar" — que salta ao passo daquele bloco.
 * O status é o do protótipo: **Completo**, **Falta pouco** para o que é
 * obrigatório e está incompleto, e **Opcional** para os três blocos puláveis.
 *
 * Os resumos são calculados aqui, e não gravados: eles descrevem o estado, e
 * gravá-los criaria uma segunda verdade que envelheceria a cada edição.
 *
 * O "Editar" é `<Link>`, e não botão: é navegação para outro passo, e a pessoa
 * que abre em nova aba tem o comportamento que espera. Os três do rodapé
 * continuam sendo `submit`, porque aqueles agem.
 */
export function Passo8Revisao({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo } = usePasso(acao);

  const comprovadas = credenciaisComprovadas(estado);
  const feedback = estado.servicos.find((servico) => servico.tipo === 'feedback');
  const opcionaisAtivos = estado.servicos.filter(
    (servico) => servico.tipo !== 'feedback' && servico.ativo,
  ).length;

  const blocos: readonly Bloco[] = [
    {
      rotulo: CURADOR_CADASTRO.titulos[0],
      resumo:
        estado.nome === ''
          ? CURADOR_CADASTRO.resumoVazio.dados
          : `${estado.nome} · ${estado.email}`,
      completo: estado.nome !== '',
      opcional: false,
      passo: 1,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[1],
      resumo:
        estado.generos.length === 0
          ? CURADOR_CADASTRO.resumoVazio.generos
          : estado.generos.join(' · '),
      completo: estado.generos.length > 0,
      opcional: false,
      passo: 2,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[2],
      resumo: resumoDaAtuacao(estado),
      completo: estado.atuacao.length > 0 && estado.tempoAtuacao !== null,
      opcional: false,
      passo: 3,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[3],
      resumo:
        estado.canais.length === 0
          ? CURADOR_CADASTRO.resumoVazio.canais
          : estado.canais.map((canal) => `${canal.tipo}: ${canal.nome}`).join(' · '),
      completo: estado.canais.length > 0,
      opcional: true,
      passo: 4,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[4],
      resumo: `Feedback a ${feedback?.precoClaves ?? 0} Claves${
        opcionaisAtivos > 0 ? ` · +${opcionaisAtivos} serviços` : ''
      }`,
      completo: feedback !== undefined && feedback.ativo,
      opcional: false,
      passo: 5,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[5],
      resumo: `${comprovadas} comprovadas`,
      completo: comprovadas > 0,
      opcional: true,
      passo: 6,
    },
    {
      rotulo: CURADOR_CADASTRO.titulos[6],
      resumo: estado.especialidade ?? CURADOR_CADASTRO.resumoVazio.bio,
      completo: (estado.bio ?? '').length >= 40 && (estado.especialidade ?? '') !== '',
      opcional: true,
      passo: 7,
    },
  ];

  const erro = motivo === undefined ? undefined : MOTIVOS[motivo];

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {erro !== undefined ? (
        <Aviso tom="erro" titulo={erro}>
          {CURADOR_CADASTRO.subtitulos[4]}
        </Aviso>
      ) : null}

      <ul className={estilos.revisao}>
        {blocos.map((bloco) => (
          <li key={bloco.rotulo} className={estilos.blocoRevisao}>
            <span className={estilos.blocoTextos}>
              <span className={estilos.blocoRotulo}>{bloco.rotulo}</span>
              <span className={estilos.blocoResumo}>{bloco.resumo}</span>
            </span>

            <span className={classeDoStatus(bloco)}>{textoDoStatus(bloco)}</span>

            <Link
              className={estilos.editar}
              href={`${ROTA.CURADOR_CADASTRO}/${bloco.passo}`}
              aria-label={`${CURADOR_CADASTRO.editar}: ${bloco.rotulo}`}
            >
              {CURADOR_CADASTRO.editar}
            </Link>
          </li>
        ))}
      </ul>

      <p className={estilos.nota}>{CURADOR_CADASTRO.avisoAvaliacao}</p>

      <p className={estilos.nota}>
        {CURADOR_CADASTRO.aceiteAntes}
        <Link className={estilos.link} href={ROTA.TERMOS}>
          {CURADOR_CADASTRO.aceiteTermos}
        </Link>
        {CURADOR_CADASTRO.aceiteEntre}
        <Link className={estilos.link} href={ROTA.PRIVACIDADE}>
          {CURADOR_CADASTRO.aceitePrivacidade}
        </Link>
        {CURADOR_CADASTRO.aceiteDepois}
      </p>

      <AcoesDoPasso
        passo={passo}
        ultimo
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );

  function classeDoStatus(bloco: Bloco): string {
    if (bloco.completo) return estilos.statusCompleto ?? '';
    return bloco.opcional ? (estilos.statusOpcional ?? '') : (estilos.statusFaltaPouco ?? '');
  }

  function textoDoStatus(bloco: Bloco): string {
    if (bloco.completo) return CURADOR_CADASTRO.statusCompleto;
    return bloco.opcional
      ? CURADOR_CADASTRO.statusOpcional
      : CURADOR_CADASTRO.statusFaltaPouco;
  }
}

function resumoDaAtuacao(estado: EstadoDoCadastro): string {
  if (estado.atuacao.length === 0) return CURADOR_CADASTRO.resumoVazio.atuacao;
  const tempo = rotuloDoTempo(estado.tempoAtuacao);
  return estado.atuacao.join(' · ') + (tempo === null ? '' : ` · ${tempo}`);
}
