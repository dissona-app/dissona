'use client';

import Image from 'next/image';
import { useActionState, useRef, useState, useTransition } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
import type { FalhaDeAcao, ResultadoDeAcao } from '@/lib/acoes';
import type { FaixaEmEdicao, LimitesDeUpload, MetadadosDetectados } from '@/modulos/faixa/tipos';
import { ENVIAR as TEXTOS } from '@/textos/prototipo';

import estilos from './FormularioDaFaixa.module.css';

export type PropsFormularioDaFaixa = {
  readonly faixa: FaixaEmEdicao | null;
  readonly limites: LimitesDeUpload;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly detectar: (link: string) => Promise<ResultadoDeAcao<MetadadosDetectados>>;
};

/**
 * Passo 1 do envio (3).
 *
 * O protótipo desenha "Colar link" **ou** "Enviar arquivo" como caminhos
 * alternativos. Aqui os dois convivem e o **arquivo é obrigatório**: com
 * `escuta_exigida_quando_link = true`, o link é fonte de metadado e o áudio é
 * o que o curador ouve. Sem ele, o gate de 60% fica inverificável.
 *
 * "Detectar faixa" (3.1) lê o oEmbed do link e preenche o título; capa e
 * artista aparecem no cartão "Faixa encontrada". Sem detecção, a tela abre o
 * preenchimento manual — o mesmo formulário, sem nada preenchido. O que foi
 * detectado viaja num campo escondido e é conferido de novo no servidor.
 */
export function FormularioDaFaixa({ faixa, limites, acao, detectar }: PropsFormularioDaFaixa) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [lancada, setLancada] = useState<'sim' | 'nao' | ''>(
    faixa?.lancada === true ? 'sim' : faixa?.lancada === false ? 'nao' : '',
  );
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [nomeDaCapa, setNomeDaCapa] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(faixa?.titulo ?? '');
  const [urlSpotify, setUrlSpotify] = useState(faixa?.urlSpotify ?? '');
  const [urlYoutube, setUrlYoutube] = useState(faixa?.urlYoutube ?? '');
  const [detectado, setDetectado] = useState<MetadadosDetectados | null>(
    faixa?.metadadosDetectados ?? null,
  );
  const [falhaDaDeteccao, setFalhaDaDeteccao] = useState<FalhaDeAcao | null>(null);
  const [detectando, iniciarDeteccao] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  const falha = resultado !== null && !resultado.ok ? resultado : null;

  const MOTIVOS: Readonly<Record<string, string>> = {
    titulo_vazio: TEXTOS.erroTituloVazio,
    titulo_longo: TEXTOS.erroTituloLongo,
    estilo_longo: TEXTOS.erroEstiloLongo,
    data_invalida: TEXTOS.erroDataInvalida,
    data_obrigatoria: TEXTOS.erroDataObrigatoria,
    link_vazio: TEXTOS.erroLinkVazio,
    link_invalido: TEXTOS.erroLinkInvalido,
    link_com_espaco: TEXTOS.erroLinkComEspaco,
    link_nao_suportado: TEXTOS.erroLinkNaoSuportado,
    ausente: TEXTOS.erroArquivoAusente,
    formato: TEXTOS.erroArquivoFormato(limites.formatos),
    tamanho: TEXTOS.erroArquivoTamanho(limites.tamanhoMaxMb),
  };

  const erroDe = (campo: string): string | undefined => {
    if (falha === null) return undefined;
    if (campo === 'audio' && falha.campo === 'audio') {
      const motivo = falha.detalhes?.['motivo'];
      return typeof motivo === 'string' ? MOTIVOS[motivo] : TEXTOS.erroArquivoAusente;
    }
    const motivo = falha.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // A detecção lê o Spotify primeiro; o erro dela aparece no campo que ela leu.
  const linkLido: 'urlSpotify' | 'urlYoutube' =
    urlSpotify.trim() !== '' ? 'urlSpotify' : 'urlYoutube';
  const motivoDoLink = falhaDaDeteccao?.detalhes?.['motivo'];
  const erroDoLink = typeof motivoDoLink === 'string' ? MOTIVOS[motivoDoLink] : undefined;
  const naoEncontrada = falhaDaDeteccao !== null && erroDoLink === undefined;

  const detectarFaixa = () => {
    const link = linkLido === 'urlSpotify' ? urlSpotify : urlYoutube;
    iniciarDeteccao(async () => {
      const resposta = await detectar(link);
      if (resposta.ok) {
        setFalhaDaDeteccao(null);
        setDetectado(resposta.dados);
        setTitulo(resposta.dados.titulo);
      } else {
        setFalhaDaDeteccao(resposta);
        setDetectado(null);
      }
    });
  };

  // Trocar o link invalida o que foi detectado com o anterior.
  const mudarLink = (mudar: (valor: string) => void, valor: string) => {
    mudar(valor);
    setDetectado(null);
    setFalhaDaDeteccao(null);
  };

  const focarTitulo = () => {
    formulario.current?.querySelector<HTMLInputElement>('input[name="titulo"]')?.focus();
  };

  const aceitos = limites.formatos.map((f) => `.${f}`).join(',');

  return (
    <form ref={formulario} action={enviar} className={estilos.base} noValidate>
      {faixa !== null ? <input type="hidden" name="faixaId" value={faixa.id} /> : null}
      <input
        type="hidden"
        name="metadados"
        value={detectado === null ? '' : JSON.stringify(detectado)}
      />

      <Painel titulo={TEXTOS.enviarArquivo} sublegenda={TEXTOS.enviarArquivoApoio}>
        <label className={estilos.dropzone}>
          <input
            type="file"
            name="audio"
            accept={aceitos}
            className={estilos.entradaDeArquivo}
            onChange={(e) => setNomeDoArquivo(e.target.files?.[0]?.name ?? null)}
          />
          <span className={estilos.dropzoneTitulo}>
            {nomeDoArquivo !== null
              ? TEXTOS.arquivoEscolhido(nomeDoArquivo)
              : faixa?.arquivoCaminho != null
                ? TEXTOS.arquivoEscolhido(faixa.arquivoCaminho.split('/').pop() ?? '')
                : TEXTOS.dropzoneVazia}
          </span>
          <span className={estilos.dropzoneApoio}>{TEXTOS.dropzone(limites.tamanhoMaxMb)}</span>
        </label>

        {erroDe('audio') !== undefined ? <Aviso tom="erro">{erroDe('audio')}</Aviso> : null}

        <Aviso tom="info" estatico>
          {TEXTOS.arquivoSempreNecessario}
        </Aviso>
      </Painel>

      <Painel titulo={TEXTOS.colarLink} sublegenda={TEXTOS.colarLinkApoio} nivel={3}>
        <div className={estilos.par}>
          <Campo
            name="urlSpotify"
            rotulo={TEXTOS.rotuloSpotify}
            value={urlSpotify}
            onChange={(e) => mudarLink(setUrlSpotify, e.target.value)}
            erro={erroDe('urlSpotify') ?? (linkLido === 'urlSpotify' ? erroDoLink : undefined)}
            inputMode="url"
          />
          <Campo
            name="urlYoutube"
            rotulo={TEXTOS.rotuloYoutube}
            value={urlYoutube}
            onChange={(e) => mudarLink(setUrlYoutube, e.target.value)}
            erro={erroDe('urlYoutube') ?? (linkLido === 'urlYoutube' ? erroDoLink : undefined)}
            inputMode="url"
          />
        </div>

        <div className={estilos.acoes}>
          <Botao
            type="button"
            variante="secundario"
            carregando={detectando}
            disabled={urlSpotify.trim() === '' && urlYoutube.trim() === ''}
            onClick={detectarFaixa}
          >
            {detectando ? TEXTOS.detectando : TEXTOS.detectar}
          </Botao>
        </div>

        {detectado !== null ? (
          <div className={estilos.detectada} aria-live="polite">
            {detectado.capaUrl !== null ? (
              <Image
                // A capa vem do CDN do provedor; `unoptimized` evita abrir
                // `remotePatterns` para hosts de terceiros.
                unoptimized
                src={detectado.capaUrl}
                alt={TEXTOS.capaDetectada(detectado.titulo)}
                width={64}
                height={64}
                className={estilos.capaDetectada}
              />
            ) : null}
            <span className={estilos.detectadaTexto}>
              <span className={estilos.detectadaRotulo}>{TEXTOS.faixaEncontrada}</span>
              <span className={estilos.detectadaTitulo}>{detectado.titulo}</span>
              {detectado.artista !== null ? (
                <span className={estilos.detectadaArtista}>{detectado.artista}</span>
              ) : null}
            </span>
            <Botao type="button" variante="neutro" tamanho="sm" onClick={focarTitulo}>
              {TEXTOS.corrigirDados}
            </Botao>
          </div>
        ) : null}

        {naoEncontrada ? <Aviso tom="alerta">{TEXTOS.naoDetectada}</Aviso> : null}
      </Painel>

      <Painel titulo={TEXTOS.detalhesTitulo} nivel={3}>
        <Campo
          name="titulo"
          rotulo={TEXTOS.rotuloTitulo}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          erro={erroDe('titulo')}
          required
        />

        {/* A capa é opcional — `faixa.capa_caminho` é anulável, e o protótipo
            não a exige. Bucket `capas`, que é público. */}
        <label className={estilos.capa}>
          <input
            type="file"
            name="capa"
            accept="image/jpeg,image/png"
            className={estilos.entradaDeArquivo}
            onChange={(e) => setNomeDaCapa(e.target.files?.[0]?.name ?? null)}
          />
          <span className={estilos.capaTitulo}>
            {nomeDaCapa ?? (faixa?.capaCaminho != null ? TEXTOS.capaTrocar : TEXTOS.capaEnviar)}
          </span>
        </label>

        <div className={estilos.par}>
          <Campo
            name="estilo"
            rotulo={TEXTOS.rotuloEstilo}
            defaultValue={faixa?.estilo ?? ''}
            erro={erroDe('estilo')}
          />
          <Campo
            name="dataLancamento"
            type="date"
            rotulo={TEXTOS.rotuloData(lancada === 'sim' ? true : lancada === 'nao' ? false : null)}
            defaultValue={faixa?.dataLancamento ?? ''}
            erro={erroDe('dataLancamento')}
          />
        </div>

        <Grupo
          rotulo={TEXTOS.perguntaLancada}
          opcoes={[
            { valor: 'sim', rotulo: TEXTOS.lancadaSim },
            { valor: 'nao', rotulo: TEXTOS.lancadaNao },
          ]}
          valor={lancada === '' ? 'nao' : lancada}
          onMudar={(valor) => setLancada(valor as 'sim' | 'nao')}
        />
        <input type="hidden" name="lancada" value={lancada} />
      </Painel>

      <div className={estilos.acoes}>
        <Botao type="submit" carregando={pendente}>
          {TEXTOS.continuar}
        </Botao>
      </div>
    </form>
  );
}
