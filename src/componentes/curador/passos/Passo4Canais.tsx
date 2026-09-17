'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Selecao } from '@/componentes/base/Selecao';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  canal_vazio: CURADOR_CADASTRO.erroCanalVazio,
  canal_sem_nome: CURADOR_CADASTRO.erroCanalSemNome,
  canal_link: CURADOR_CADASTRO.erroCanalLink,
};

type Linha = {
  readonly chave: number;
  readonly tipo: string;
  readonly nome: string;
  readonly url: string;
};

/**
 * Passo 4 — canais. Pulável.
 *
 * ## As linhas são estado local, e os valores não
 *
 * O que o React controla aqui é **quantas** linhas existem, não o que há
 * dentro delas: cada campo é `defaultValue` e o valor vive no DOM. Controlar
 * os valores obrigaria um `onChange` por caractere em três campos por linha,
 * e não compraria nada — o servidor é quem valida, e o `FormData` lê o DOM.
 *
 * A `chave` é um contador, e não o índice do array: remover a linha do meio com
 * índice como `key` faria o React reaproveitar o DOM da linha seguinte, e o
 * valor digitado apareceria na linha errada. É o bug clássico de lista com
 * `key={i}`, e aqui ele seria visível.
 */
export function Passo4Canais({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo, falha } = usePasso(acao);

  const [linhas, setLinhas] = useState<readonly Linha[]>(() =>
    estado.canais.length > 0
      ? estado.canais.map((canal, indice) => ({
          chave: indice,
          tipo: canal.tipo,
          nome: canal.nome,
          url: canal.url,
        }))
      : [{ chave: 0, tipo: 'playlist', nome: '', url: '' }],
  );
  const [proximaChave, setProximaChave] = useState(linhas.length);

  function acrescentar() {
    setLinhas((atuais) => [
      ...atuais,
      { chave: proximaChave, tipo: 'playlist', nome: '', url: '' },
    ]);
    setProximaChave((chave) => chave + 1);
  }

  function remover(chave: number) {
    setLinhas((atuais) => atuais.filter((linha) => linha.chave !== chave));
  }

  const erro = motivo === undefined ? undefined : MOTIVOS[motivo];
  const erroGeral = erroGeralDe(falha, [erro]);

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {(erro ?? erroGeral) !== undefined ? (
        <Aviso tom="erro" titulo={erro ?? erroGeral}>
          {CURADOR_CADASTRO.subtitulos[3]}
        </Aviso>
      ) : null}

      <ul className={estilos.linhas}>
        {linhas.map((linha) => (
          <li key={linha.chave} className={estilos.linha}>
            <Selecao
              name="canal_tipo"
              rotulo={CURADOR_CADASTRO.rotuloTipoDoCanal}
              defaultValue={linha.tipo}
              opcoes={CURADOR_CADASTRO.tiposDeCanal.map((tipo) => ({
                valor: tipo.valor,
                rotulo: tipo.rotulo,
              }))}
            />

            <Campo
              name="canal_nome"
              type="text"
              rotulo={CURADOR_CADASTRO.rotuloNomeDoCanal}
              placeholder={CURADOR_CADASTRO.placeholderNomeDoCanal}
              defaultValue={linha.nome}
            />

            <Campo
              name="canal_link"
              type="text"
              rotulo={CURADOR_CADASTRO.rotuloLinkDoCanal}
              placeholder={CURADOR_CADASTRO.placeholderLinkDoCanal}
              defaultValue={linha.url}
              inputMode="url"
            />

            {/*
              A remoção só aparece com mais de uma linha: remover a única
              deixaria a tela sem nenhum campo, e o "Pular" já é o jeito de
              seguir sem canal.
            */}
            {linhas.length > 1 ? (
              <button
                type="button"
                className={estilos.remover}
                onClick={() => remover(linha.chave)}
                aria-label={`${CURADOR_CADASTRO.removerCanal}: ${linha.nome === '' ? linha.tipo : linha.nome}`}
                title={CURADOR_CADASTRO.removerCanal}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className={estilos.acessorio}>
        <Botao type="button" variante="secundario" tamanho="sm" onClick={acrescentar}>
          {CURADOR_CADASTRO.adicionarCanal}
        </Botao>
      </div>

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
