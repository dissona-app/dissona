'use client';

import { useActionState, useState } from 'react';

import { AreaTexto, Aviso, Botao, Campo, Chips, Painel } from '@/componentes/base';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { MAXIMO_DA_BIO, MAXIMO_DE_GENEROS } from '@/modulos/artista/tipos';
import type { PerfilDoArtista } from '@/modulos/artista/tipos';
import { erroGeralDe } from '@/textos/erros';
import { ARTISTA_PERFIL as TEXTOS, GENEROS_DO_ARTISTA } from '@/textos/prototipo';

import estilos from './FormularioDePerfil.module.css';

export type PropsFormularioDePerfil = {
  readonly perfil: PerfilDoArtista;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * Motivo do schema → texto, aqui e não no serviço (architecture.md §8).
 *
 * `conflito` é o caso do `handle` já em uso: o repositório re-etiqueta o
 * `23505` de `perfil` com `campo: 'handle'`, e o único índice único daquela
 * tabela afora a PK é o handle.
 */
const MOTIVOS: Readonly<Record<string, string>> = {
  nome_exibicao_longo: TEXTOS.erroNomeExibicaoLongo,
  cidade_longa: TEXTOS.erroCidadeLonga,
  handle_formato: TEXTOS.erroHandleFormato,
  bio_longa: TEXTOS.erroBioLonga,
  generos_demais: TEXTOS.erroGenerosDemais,
  genero_desconhecido: TEXTOS.erroGeneroDesconhecido,
  link_invalido: TEXTOS.erroLinkInvalido,
  link_com_espaco: TEXTOS.erroLinkComEspaco,
  link_vazio: TEXTOS.erroLinkInvalido,
};

export function FormularioDePerfil({ perfil, acao }: PropsFormularioDePerfil) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  // A bio é controlada porque o contador de `AreaTexto` lê `value`. Os demais
  // campos ficam não controlados — não têm contador, e `defaultValue` basta.
  const [bio, setBio] = useState(perfil.bio ?? '');

  const falha = resultado !== null && !resultado.ok ? resultado : null;

  const erroDe = (campo: string): string | undefined => {
    if (falha === null) return undefined;

    // Colisão de `handle` não vem do schema: chega como CONFLITO de campo
    // único, levantado pelo repositório a partir do `23505` de `perfil`.
    if (campo === 'handle' && falha.campo === 'handle') return TEXTOS.erroHandleEmUso;

    const motivo = falha.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // RF-019: `PAPEL_AUSENTE` e o `NAO_AUTORIZADO` de um update que afetou zero
  // linhas chegam sem campo. A tela só desenhava o aviso de sucesso, então
  // "Salvar" não fazia nada — nem salvava, nem dizia por quê.
  const erroGeral = erroGeralDe(falha, [
    erroDe('nomeExibicao'),
    erroDe('cidade'),
    erroDe('handle'),
    erroDe('bio'),
    erroDe('generos'),
    erroDe('linkInstagram'),
    erroDe('linkSpotify'),
    erroDe('linkYoutube'),
    erroDe('linkSite'),
  ]);

  return (
    <form action={enviar} className={estilos.base} noValidate>
      {resultado !== null && resultado.ok ? <Aviso tom="sucesso">{TEXTOS.salvo}</Aviso> : null}
      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      <Painel titulo={TEXTOS.titulo} sublegenda={TEXTOS.subtitulo}>
        <div className={estilos.par}>
          <Campo
            name="nomeExibicao"
            rotulo={TEXTOS.rotuloNomeExibicao}
            defaultValue={perfil.nomeExibicao ?? ''}
            erro={erroDe('nomeExibicao')}
            autoComplete="nickname"
          />
          <Campo
            name="cidade"
            rotulo={TEXTOS.rotuloCidade}
            defaultValue={perfil.cidade ?? ''}
            erro={erroDe('cidade')}
            autoComplete="address-level2"
          />
        </div>

        <Campo
          name="handle"
          rotulo={TEXTOS.rotuloHandle}
          defaultValue={perfil.handle ?? ''}
          auxiliar={TEXTOS.auxiliarHandle}
          erro={erroDe('handle')}
          autoComplete="username"
        />

        <AreaTexto
          name="bio"
          rotulo={TEXTOS.rotuloBio}
          variante="bio"
          limite={MAXIMO_DA_BIO}
          value={bio}
          onChange={(evento) => setBio(evento.target.value)}
          erro={erroDe('bio')}
        />

        <Chips
          name="genero"
          rotulo={`${TEXTOS.rotuloGeneros} ${TEXTOS.sufixoGeneros}`}
          opcoes={GENEROS_DO_ARTISTA}
          selecionados={perfil.generos}
          maximo={MAXIMO_DE_GENEROS}
          contador={(quantos) => TEXTOS.contagemGeneros(quantos, MAXIMO_DE_GENEROS)}
          erro={erroDe('generos')}
        />
      </Painel>

      <Painel titulo={TEXTOS.rotuloLinks} nivel={3}>
        <div className={estilos.par}>
          <Campo
            name="linkInstagram"
            rotulo={TEXTOS.rotuloInstagram}
            defaultValue={perfil.linkInstagram ?? ''}
            erro={erroDe('linkInstagram')}
            inputMode="url"
          />
          <Campo
            name="linkSpotify"
            rotulo={TEXTOS.rotuloSpotify}
            defaultValue={perfil.linkSpotify ?? ''}
            erro={erroDe('linkSpotify')}
            inputMode="url"
          />
          <Campo
            name="linkYoutube"
            rotulo={TEXTOS.rotuloYoutube}
            defaultValue={perfil.linkYoutube ?? ''}
            erro={erroDe('linkYoutube')}
            inputMode="url"
          />
          <Campo
            name="linkSite"
            rotulo={TEXTOS.rotuloSite}
            defaultValue={perfil.linkSite ?? ''}
            erro={erroDe('linkSite')}
            inputMode="url"
          />
        </div>
      </Painel>

      <div className={estilos.acoes}>
        <Botao type="submit" carregando={pendente}>
          {TEXTOS.salvar}
        </Botao>
        <span className={estilos.nota}>{TEXTOS.nota}</span>
      </div>
    </form>
  );
}
