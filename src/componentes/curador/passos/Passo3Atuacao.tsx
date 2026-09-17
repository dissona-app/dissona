'use client';

import { Aviso, Chips } from '@/componentes/base';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { TEMPO_DE_ATUACAO } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { Segmentado } from '../Segmentado';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  frente_obrigatoria: CURADOR_CADASTRO.erroFrentes,
  tempo_obrigatorio: CURADOR_CADASTRO.erroTempo,
};

/**
 * Passo 3 — frentes de atuação e tempo.
 *
 * Duas perguntas num passo, e por isso é um dos dois que devolvem erro **por
 * campo**: marcar as frentes e esquecer o tempo tem de apontar o tempo, não o
 * passo.
 *
 * O tempo é escolha única, e vai no `Grupo` — o radiogroup acessível do Design
 * System. O protótipo o desenha como segmented control e o §2.2.5 registra que
 * "radio não existe no Release 2"; o `Grupo` cobre os dois, porque é radio de
 * verdade com aparência de segmented.
 *
 * O valor enviado é o **código** do banco (`<1`, `1-3`…), e não o rótulo da
 * tela: o `check perfil_curador_tempo_conhecido` recusaria "Até 1 ano". O mapa
 * entre os dois vive em `modulos/curador/tipos.ts`.
 */
export function Passo3Atuacao({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo, motivos, falha } = usePasso(acao);

  const erroDe = (campo: string): string | undefined => {
    const codigo = motivos[campo] ?? (campo === 'frentes' ? motivo : undefined);
    return codigo === undefined ? undefined : MOTIVOS[codigo];
  };

  const erroGeral = erroGeralDe(falha, [erroDe('frentes'), erroDe('tempo')]);

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      <Chips
        name="frente"
        opcoes={CURADOR_CADASTRO.frentes}
        selecionados={estado.atuacao}
        rotulo={CURADOR_CADASTRO.rotuloFrentes}
        erro={erroDe('frentes')}
      />

      {/*
        As opções vêm de `TEMPO_DE_ATUACAO`, que é o mapa código↔rótulo — e é
        de lá justamente para não haver uma segunda lista. O valor enviado é o
        código; o `check` do banco recusaria o rótulo.
      */}
      <Segmentado
        name="tempo"
        rotulo={CURADOR_CADASTRO.rotuloTempo}
        opcoes={TEMPO_DE_ATUACAO.map((item) => ({
          valor: item.codigo,
          rotulo: item.rotulo,
        }))}
        valorInicial={estado.tempoAtuacao ?? undefined}
        erro={erroDe('tempo')}
      />

      <AcoesDoPasso
        passo={passo}
        ultimo={false}
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
