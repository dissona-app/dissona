'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';

import { AcoesDoPasso } from '../AcoesDoPasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';
import { usePasso } from '../usePasso';

const MOTIVOS: Readonly<Record<string, string>> = {
  formato_nao_suportado: CURADOR_CADASTRO.erroFotoTipo,
  arquivo_muito_grande: CURADOR_CADASTRO.erroFotoTamanho,
};

export type PropsPasso1 = PropsDoPasso & {
  readonly estado: EstadoDoCadastro;
};

/**
 * Passo 1 — dados básicos.
 *
 * Nome e e-mail em **leitura**: "Nome e e-mail vêm da conta em que você já
 * está. A senha segue a mesma." O protótipo tem uma variante com campo de
 * senha, para quem chega ao wizard sem estar logado; no produto isso não
 * acontece — a guarda de `(app)/curador` exige o papel, e o papel exige sessão.
 *
 * A foto é o único campo gravável, e é opcional. Um passo sem nada obrigatório
 * ainda vale existir: é onde a pessoa confirma que está na conta certa antes de
 * responder oito perguntas.
 */
export function Passo1Dados({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsPasso1) {
  // Sem `pendente`: quem desabilita os botões é o `useFormStatus` dentro de
  // `AcoesDoPasso`, que lê o estado do formulário em que ele está.
  const { enviar, motivo } = usePasso(acao);
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);

  const erro = motivo === undefined ? undefined : MOTIVOS[motivo];

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {erro !== undefined ? (
        <Aviso tom="erro" titulo={erro}>
          {CURADOR_CADASTRO.fotoHint}
        </Aviso>
      ) : null}

      <div className={estilos.foto}>
        <span className={estilos.avatar} aria-hidden="true">
          {iniciaisDe(estado.nome)}
        </span>

        <div className={estilos.fotoTextos}>
          {/*
            `<label>` envolvendo o input de arquivo: é o que dá um alvo de
            clique do tamanho do botão sem precisar de `onClick` e de um input
            escondido controlado por JavaScript.
          */}
          <label className={estilos.fotoBotao}>
            {CURADOR_CADASTRO.adicionarFoto}
            <input
              type="file"
              name="foto"
              accept="image/jpeg,image/png"
              className={estilos.arquivo}
              onChange={(evento) => setNomeDoArquivo(evento.target.files?.[0]?.name ?? null)}
            />
          </label>
          <span className={estilos.fotoHint}>
            {nomeDoArquivo ?? (estado.fotoCaminho === null ? CURADOR_CADASTRO.fotoHint : 'Foto enviada')}
          </span>
        </div>
      </div>

      <p className={estilos.nota}>{CURADOR_CADASTRO.herdado}</p>

      <div className={estilos.leituras}>
        <div className={estilos.leitura}>
          <span className={estilos.leituraRotulo}>{CURADOR_CADASTRO.rotuloNome}</span>
          <span className={estilos.leituraValor}>{estado.nome}</span>
        </div>
        <div className={estilos.leitura}>
          <span className={estilos.leituraRotulo}>{CURADOR_CADASTRO.rotuloEmail}</span>
          <span className={estilos.leituraValor}>{estado.email}</span>
        </div>
      </div>

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

/** Duas iniciais, como o `initials` do protótipo. */
function iniciaisDe(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
