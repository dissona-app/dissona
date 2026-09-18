'use client';

import Image from 'next/image';
import { useActionState, useRef, useState, useTransition } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
import type { FalhaDeAcao, ResultadoDeAcao } from '@/lib/acoes';
import { criarClienteNavegador } from '@/lib/supabase/cliente';
import type { FaixaEmEdicao, LimitesDeUpload, MetadadosDetectados } from '@/modulos/faixa/tipos';
import { erroGeralDe } from '@/textos/erros';
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
  const [arquivoDeAudio, setArquivoDeAudio] = useState<File | null>(null);
  const [arquivoDaCapa, setArquivoDaCapa] = useState<File | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [falhaDoUpload, setFalhaDoUpload] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(faixa?.titulo ?? '');
  const [urlSpotify, setUrlSpotify] = useState(faixa?.urlSpotify ?? '');
  const [urlYoutube, setUrlYoutube] = useState(faixa?.urlYoutube ?? '');
  const [detectado, setDetectado] = useState<MetadadosDetectados | null>(
    faixa?.metadadosDetectados ?? null,
  );
  const [falhaDaDeteccao, setFalhaDaDeteccao] = useState<FalhaDeAcao | null>(null);
  const [detectando, iniciarDeteccao] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  // Arrastar e soltar. O `<label>` sozinho **não** aceita drop — quem aceita é
  // o `<input type="file">`, e ele está reduzido a 1px por `sr-only`. Então o
  // arquivo solto é escrito no input por `DataTransfer`, que é o que o põe no
  // `FormData` do envio. Sem isso, "Arraste o arquivo aqui" era uma promessa
  // que a tela não cumpria.
  const entradaDeAudio = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  function aoSoltarAudio(evento: React.DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastando(false);

    const arquivo = evento.dataTransfer.files[0];
    if (arquivo === undefined) return;

    const transferencia = new DataTransfer();
    transferencia.items.add(arquivo);
    if (entradaDeAudio.current !== null) entradaDeAudio.current.files = transferencia.files;

    setArquivoDeAudio(arquivo);
  }

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

  // Superfície geral: `salvarFaixa` recusa por situação da faixa, por envio já
  // pago e por autorização — nenhum deles é de campo, e sem isto o "Continuar"
  // não faz nada e não diz nada.
  const erroGeral = erroGeralDe(falha, [
    erroDe('audio'),
    erroDe('urlSpotify'),
    erroDe('urlYoutube'),
    erroDe('titulo'),
    erroDe('estilo'),
    erroDe('dataLancamento'),
  ]);

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

  /**
   * RF-036 · o arquivo vai do navegador **direto** ao Storage.
   *
   * O motivo é um teto que nenhuma configuração levanta: uma função serverless
   * da Vercel aceita ~4,5 MB de corpo de request, e `upload.tamanho_max_mb` é
   * 50. Enquanto o mp3 viajava dentro da Server Action, o envio por arquivo
   * simplesmente não sobrevivia ao deploy.
   *
   * Nada de policy nova: `"faixas: dono gerencia a propria pasta"` já exige
   * `(storage.foldername(name))[1] = auth.uid()`, e é exatamente a convenção de
   * caminho que `subirAudio` sempre usou. O que a ação recebe agora é o
   * **caminho**; quem lhe conta tamanho e MIME é o Storage.
   *
   * O `<input type="file">` continua no formulário, e com `name`: sem
   * JavaScript esta função não roda, o arquivo viaja no `multipart` como antes
   * e `salvarFaixa` valida pelo `File`. Os dois caminhos existem, e o de baixo
   * é o que garante que a tela funcione sem hidratação.
   */
  const enviarComUpload = async (dados: FormData) => {
    setFalhaDoUpload(null);
    if (arquivoDeAudio === null && arquivoDaCapa === null) {
      enviar(dados);
      return;
    }

    setSubindo(true);
    try {
      const supabase = criarClienteNavegador();
      const { data: sessao } = await supabase.auth.getUser();
      const usuarioId = sessao.user?.id;
      // Sem sessão legível daqui, deixa a ação recusar: ela tem a resposta
      // certa para isso, e adivinhá-la no cliente daria duas versões da regra.
      if (usuarioId === undefined) {
        enviar(dados);
        return;
      }

      const referencia = faixa?.id ?? crypto.randomUUID();

      if (arquivoDeAudio !== null) {
        // Sem pré-checagem de tamanho ou de tipo aqui, de propósito: quem
        // recusa é o bucket, por `file_size_limit` e `allowed_mime_types`
        // (`0000_storage.sql`). Uma guarda no cliente seria um segundo lugar
        // decidindo o que é um arquivo válido, e o primeiro a divergir do banco.
        const extensao = arquivoDeAudio.type.includes('wav') ? '.wav' : '.mp3';
        const { data, error } = await supabase.storage
          .from('faixas')
          .upload(`${usuarioId}/${referencia}${extensao}`, arquivoDeAudio, {
            upsert: true,
            contentType: arquivoDeAudio.type,
          });

        if (error !== null || data === null) {
          setFalhaDoUpload(mensagemDoStorage(error?.message ?? ''));
          return;
        }

        // O caminho é o que a ação vai gravar; o arquivo não precisa mais ir.
        dados.set('audioCaminho', data.path);
        dados.delete('audio');
      }

      if (arquivoDaCapa !== null) {
        const extensao = arquivoDaCapa.type === 'image/png' ? '.png' : '.jpg';
        const { data, error } = await supabase.storage
          .from('capas')
          .upload(`${usuarioId}/${referencia}${extensao}`, arquivoDaCapa, {
            upsert: true,
            contentType: arquivoDaCapa.type,
          });

        // A capa é opcional: falhar em subi-la não pode impedir o envio da
        // faixa. O arquivo sai do corpo nos dois casos — mandá-lo junto depois
        // de o bucket o ter recusado por tamanho só faria a ação inteira bater
        // no teto de transporte, e a faixa se perderia por causa da capa.
        dados.delete('capa');
        if (error === null && data !== null) dados.set('capaCaminho', data.path);
      }
    } finally {
      setSubindo(false);
    }

    enviar(dados);
  };

  /** O Storage recusa por tamanho e por MIME — e as mensagens já existem. */
  function mensagemDoStorage(mensagem: string): string {
    const texto = mensagem.toLowerCase();
    if (texto.includes('size') || texto.includes('large')) {
      return MOTIVOS['tamanho'] ?? TEXTOS.erroArquivoAusente;
    }
    if (texto.includes('mime') || texto.includes('type')) {
      return MOTIVOS['formato'] ?? TEXTOS.erroArquivoAusente;
    }
    return TEXTOS.erroArquivoAusente;
  }

  return (
    <form ref={formulario} action={enviarComUpload} className={estilos.base} noValidate>
      {faixa !== null ? <input type="hidden" name="faixaId" value={faixa.id} /> : null}
      <input
        type="hidden"
        name="metadados"
        value={detectado === null ? '' : JSON.stringify(detectado)}
      />

      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      <Painel titulo={TEXTOS.enviarArquivo} sublegenda={TEXTOS.enviarArquivoApoio}>
        <label
          className={[estilos.dropzone, arrastando ? estilos.dropzoneAtiva : undefined]
            .filter(Boolean)
            .join(' ')}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltarAudio}
        >
          <input
            ref={entradaDeAudio}
            type="file"
            name="audio"
            accept={aceitos}
            className={estilos.entradaDeArquivo}
            onChange={(e) => setArquivoDeAudio(e.target.files?.[0] ?? null)}
          />
          <span className={estilos.dropzoneTitulo}>
            {arrastando
              ? TEXTOS.dropzoneSoltar
              : arquivoDeAudio !== null
                ? TEXTOS.arquivoEscolhido(arquivoDeAudio.name)
                : faixa?.arquivoCaminho != null
                  ? TEXTOS.arquivoEscolhido(faixa.arquivoCaminho.split('/').pop() ?? '')
                  : TEXTOS.dropzoneVazia}
          </span>
          <span className={estilos.dropzoneApoio}>{TEXTOS.dropzone(limites.tamanhoMaxMb)}</span>
        </label>

        {(falhaDoUpload ?? erroDe('audio')) !== undefined ? (
          <Aviso tom="erro">{falhaDoUpload ?? erroDe('audio')}</Aviso>
        ) : null}

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
            onChange={(e) => setArquivoDaCapa(e.target.files?.[0] ?? null)}
          />
          <span className={estilos.capaTitulo}>
            {arquivoDaCapa?.name ??
              (faixa?.capaCaminho != null ? TEXTOS.capaTrocar : TEXTOS.capaEnviar)}
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
        <Botao type="submit" carregando={pendente || subindo}>
          {TEXTOS.continuar}
        </Botao>
      </div>
    </form>
  );
}
