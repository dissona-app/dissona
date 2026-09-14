'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@/lib/acoes';
import type { FaixaEmEdicao, LimitesDeUpload } from '@/modulos/faixa/tipos';
import { ENVIAR as TEXTOS } from '@/textos/prototipo';

import estilos from './FormularioDaFaixa.module.css';

export type PropsFormularioDaFaixa = {
  readonly faixa: FaixaEmEdicao | null;
  readonly limites: LimitesDeUpload;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * Passo 1 do envio (3).
 *
 * O protótipo desenha "Colar link" **ou** "Enviar arquivo" como caminhos
 * alternativos. Aqui os dois convivem e o **arquivo é obrigatório**: com
 * `escuta_exigida_quando_link = true`, o link é fonte de metadado e o áudio é
 * o que o curador ouve. Sem ele, o gate de 60% fica inverificável.
 *
 * A detecção por link (Spotify/YouTube) é de outra fatia — enquanto ela não
 * chega, os campos de link são preenchidos à mão, que é o caminho que o próprio
 * protótipo já oferece em "Corrigir dados".
 */
export function FormularioDaFaixa({ faixa, limites, acao }: PropsFormularioDaFaixa) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [lancada, setLancada] = useState<'sim' | 'nao' | ''>(
    faixa?.lancada === true ? 'sim' : faixa?.lancada === false ? 'nao' : '',
  );
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [nomeDaCapa, setNomeDaCapa] = useState<string | null>(null);

  const falha = resultado !== null && !resultado.ok ? resultado : null;

  const MOTIVOS: Readonly<Record<string, string>> = {
    titulo_vazio: TEXTOS.erroTituloVazio,
    titulo_longo: TEXTOS.erroTituloLongo,
    estilo_longo: TEXTOS.erroEstiloLongo,
    data_invalida: TEXTOS.erroDataInvalida,
    data_obrigatoria: TEXTOS.erroDataObrigatoria,
    link_invalido: TEXTOS.erroLinkInvalido,
    link_com_espaco: TEXTOS.erroLinkComEspaco,
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

  const aceitos = limites.formatos.map((f) => `.${f}`).join(',');

  return (
    <form action={enviar} className={estilos.base} noValidate>
      {faixa !== null ? <input type="hidden" name="faixaId" value={faixa.id} /> : null}

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
            defaultValue={faixa?.urlSpotify ?? ''}
            erro={erroDe('urlSpotify')}
            inputMode="url"
          />
          <Campo
            name="urlYoutube"
            rotulo={TEXTOS.rotuloYoutube}
            defaultValue={faixa?.urlYoutube ?? ''}
            erro={erroDe('urlYoutube')}
            inputMode="url"
          />
        </div>
      </Painel>

      <Painel titulo={TEXTOS.detalhesTitulo} nivel={3}>
        <Campo
          name="titulo"
          rotulo={TEXTOS.rotuloTitulo}
          defaultValue={faixa?.titulo ?? ''}
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
