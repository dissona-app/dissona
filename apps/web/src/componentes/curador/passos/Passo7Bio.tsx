'use client';

import { useState } from 'react';

import { AreaTexto } from '@/componentes/base/AreaTexto';
import { Aviso } from '@/componentes/base/Aviso';
import { Campo } from '@/componentes/base/Campo';
import { BIO_MAX_CARACTERES, BIO_MIN_CARACTERES } from '@/modulos/curador/esquemas';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  bio_curta: CURADOR_CADASTRO.erroBioCurta,
  bio_longa: CURADOR_CADASTRO.erroBioCurta,
};

/**
 * Passo 7 — bio e especialidade. Pulável.
 *
 * A bio é opcional, mas **começada** tem de chegar aos 40 caracteres: é o que o
 * protótipo verifica, e faz sentido — "escuto música" não é uma bio que ajude o
 * artista a escolher. Deixar em branco é diferente de escrever pouco, e só o
 * segundo é erro.
 *
 * O contador é o único estado local. Os limites vêm de `esquemas.ts`, o mesmo
 * módulo que o Zod usa: se fossem dois números, o contador diria "40 de 400" e
 * o servidor recusaria em outro ponto.
 */
export function Passo7Bio({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo, motivos, falha } = usePasso(acao);
  const [bio, setBio] = useState(estado.bio ?? '');

  const codigoDaBio = motivos['bio'] ?? motivo;
  const erroDaBio = codigoDaBio === undefined ? undefined : MOTIVOS[codigoDaBio];

  // O aviso de "faltam N caracteres" é diferente do erro: ele aparece enquanto
  // a pessoa digita, e some quando ela chega ao mínimo. O erro só aparece
  // depois de enviar.
  const faltam = bio.trim() === '' ? 0 : Math.max(0, BIO_MIN_CARACTERES - bio.trim().length);

  const erroDaEspecialidade =
    motivos['especialidade'] === undefined ? undefined : MOTIVOS[motivos['especialidade']];
  const erroGeral = erroGeralDe(falha, [erroDaBio, erroDaEspecialidade]);

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      <div className={estilos.blocoBio}>
        <AreaTexto
          name="bio"
          rotulo={CURADOR_CADASTRO.rotuloBio}
          variante="bioCurador"
          placeholder={CURADOR_CADASTRO.placeholderBio}
          value={bio}
          onChange={(evento) => setBio(evento.target.value)}
          maxLength={BIO_MAX_CARACTERES}
          rows={4}
          erro={erroDaBio}
        />

        <span className={estilos.contador}>
          {CURADOR_CADASTRO.contadorBio(bio.length, BIO_MAX_CARACTERES)}
          {faltam > 0 ? ` · faltam ${faltam} para o mínimo` : ''}
        </span>
      </div>

      <Campo
        name="especialidade"
        type="text"
        rotulo={CURADOR_CADASTRO.rotuloEspecialidade}
        placeholder={CURADOR_CADASTRO.placeholderEspecialidade}
        defaultValue={estado.especialidade ?? ''}
        erro={erroDaEspecialidade}
      />

      <AcoesDoPasso
        passo={passo}
        ultimo={false}
        podePular
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
