'use client';

import { useState } from 'react';

import { AreaTexto, Aviso, Botao, BotaoLink, Campo, CampoDeFoto, Chips } from '@/componentes/base';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { MAXIMO_DA_BIO, MAXIMO_DE_GENEROS } from '@/modulos/artista/tipos';
import type { PerfilDoArtista } from '@/modulos/artista/tipos';
import { erroGeralDe } from '@dissona/nucleo/textos/erros';
import { ARTISTA_PERFIL as TEXTOS, GENEROS_DO_ARTISTA } from '@dissona/nucleo/textos/prototipo';

import estilos from './FormularioDePerfil.module.css';
import { useAcaoDoFormulario } from '@dissona/nucleo/hooks/useAcaoDoFormulario';

export type PropsFormularioDePerfil = {
  readonly perfil: PerfilDoArtista;
  /** URL pública da foto atual, já com o cache-buster. Montada no servidor. */
  readonly fotoUrl: string | null;
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
  foto_tipo: TEXTOS.erroFotoTipo,
  foto_tamanho: TEXTOS.erroFotoTamanho,
  foto_ausente: TEXTOS.erroFotoAusente,
  foto_alheia: TEXTOS.erroFotoAlheia,
};

export function FormularioDePerfil({ perfil, fotoUrl, acao }: PropsFormularioDePerfil) {
  // Sem o reset do React 19: um erro num campo não apaga os outros.
  const [resultado, enviar, pendente, aoEnviar] = useAcaoDoFormulario<ResultadoDeAcao | null>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  // A bio é controlada porque o contador de `AreaTexto` lê `value`. Os demais
  // campos ficam não controlados — não têm contador, e `defaultValue` basta.
  const [bio, setBio] = useState(perfil.bio ?? '');

  // Salvar com a foto ainda subindo mandaria `foto_caminho` vazio, e a troca se
  // perderia sem erro nenhum.
  const [subindoFoto, setSubindoFoto] = useState(false);

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
    erroDe('foto'),
  ]);

  return (
    <form action={enviar} onSubmit={aoEnviar} className={estilos.base} noValidate>
      {resultado !== null && resultado.ok ? <Aviso tom="sucesso">{TEXTOS.salvo}</Aviso> : null}
      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      {/* Protótipo aprovado: um só cartão — a foto no alto, os dados à
          esquerda, os links à direita e o rodapé com as ações. */}
      <div className={estilos.cartao}>
        <section className={estilos.topo} aria-label={TEXTOS.tituloDoPainel}>
          {erroDe('foto') === undefined ? null : <Aviso tom="erro">{erroDe('foto')}</Aviso>}
          <CampoDeFoto
            nome={perfil.nomeExibicao ?? perfil.nomeCompleto}
            fotoUrl={fotoUrl}
            caminhoAtual={perfil.fotoCaminho}
            aoMudarEnvio={setSubindoFoto}
            tamanho="lg"
            textos={{
              botao: TEXTOS.trocarFoto,
              hint: TEXTOS.fotoHint,
              enviando: TEXTOS.fotoEnviando,
              enviada: TEXTOS.fotoEnviada,
              erroTipo: TEXTOS.erroFotoTipo,
              erroTamanho: TEXTOS.erroFotoTamanho,
            }}
          />
        </section>

        <div className={estilos.colunas}>
          <section className={estilos.dados} aria-label={TEXTOS.subtitulo}>
            <div className={estilos.par}>
              <Campo
                name="nomeExibicao"
                rotulo={TEXTOS.rotuloNomeExibicao}
                // Sem nome artístico ainda, vale o nome do cadastro — é o que o
                // Perfil (7) já exibe; o campo vazio parecia dado perdido.
                defaultValue={perfil.nomeExibicao ?? perfil.nomeCompleto}
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
              acessorioDoRotulo={<span className={estilos.dicaDoRotulo}>{TEXTOS.handleUnico}</span>}
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
              erro={erroDe('generos')}
            />
          </section>

          <section className={estilos.links} aria-labelledby="titulo-links">
            <h3 id="titulo-links" className={estilos.overline}>
              {TEXTOS.rotuloLinks}
            </h3>
            <div className={estilos.listaDeLinks}>
              <Campo
                name="linkInstagram"
                placeholder={TEXTOS.exemploInstagram}
                rotulo={TEXTOS.rotuloInstagram}
                acessorioDoRotulo={
                  <IconeDeRede cor="#c13584">
                    {
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="0.8" />
                      </>
                    }
                  </IconeDeRede>
                }
                defaultValue={perfil.linkInstagram ?? ''}
                erro={erroDe('linkInstagram')}
                inputMode="url"
              />
              <Campo
                name="linkSpotify"
                placeholder={TEXTOS.exemploSpotify}
                rotulo={TEXTOS.rotuloSpotify}
                acessorioDoRotulo={
                  <IconeDeRede cor="#1db954">
                    {
                      <>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M7.5 9.5c3-1 6.5-.7 9 .8" />
                        <path d="M8 12.5c2.5-.7 5.2-.4 7.3.8" />
                        <path d="M8.5 15.3c2-.5 4-.3 5.6.6" />
                      </>
                    }
                  </IconeDeRede>
                }
                defaultValue={perfil.linkSpotify ?? ''}
                erro={erroDe('linkSpotify')}
                inputMode="url"
              />
              <Campo
                name="linkYoutube"
                placeholder={TEXTOS.exemploYoutube}
                rotulo={TEXTOS.rotuloYoutube}
                acessorioDoRotulo={
                  <IconeDeRede cor="#ff0033">
                    {
                      <>
                        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
                        <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
                      </>
                    }
                  </IconeDeRede>
                }
                defaultValue={perfil.linkYoutube ?? ''}
                erro={erroDe('linkYoutube')}
                inputMode="url"
              />
              <Campo
                name="linkSite"
                placeholder={TEXTOS.exemploSite}
                rotulo={TEXTOS.rotuloSite}
                acessorioDoRotulo={
                  <IconeDeRede cor="#b780e7">
                    {
                      <>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18" />
                        <path d="M12 3c2.5 2.7 2.5 15.3 0 18" />
                        <path d="M12 3c-2.5 2.7-2.5 15.3 0 18" />
                      </>
                    }
                  </IconeDeRede>
                }
                defaultValue={perfil.linkSite ?? ''}
                erro={erroDe('linkSite')}
                inputMode="url"
              />
            </div>
          </section>
        </div>

        <div className={estilos.acoes}>
          <Botao type="submit" tamanho="denso" carregando={pendente} disabled={subindoFoto}>
            {TEXTOS.salvar}
          </Botao>
          {/* "Cancelar" volta à vitrine — é o par do "Editar cadastro" de lá. O
              texto existia em `prototipo.ts` desde a R1 e não era renderizado. */}
          <BotaoLink href={ROTA.ARTISTA_PERFIL} variante="neutro" tamanho="denso">
            {TEXTOS.cancelar}
          </BotaoLink>
        </div>
      </div>
    </form>
  );
}

/** O ícone colorido de cada rede, antes do nome — protótipo aprovado. */
function IconeDeRede({
  cor,
  children,
}: {
  readonly cor: string;
  readonly children: React.ReactNode;
}) {
  return (
    <svg
      className={estilos.iconeDeRede}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
