import { Aviso } from '@/componentes/base/Aviso';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Painel } from '@/componentes/base/Painel';
import { ROTA } from '@/lib/guarda-rota';
import { rotuloDaFonte } from '@/modulos/faixa/servico';
import type { FaixaEmEdicao } from '@/modulos/faixa/tipos';
import { ENVIAR as TEXTOS } from '@/textos/prototipo';

import estilos from './Revisao.module.css';

export type PropsRevisao = {
  readonly faixa: FaixaEmEdicao;
  /** Saldo já formatado — "25,00 Claves". `null` se a conta não tem carteira. */
  readonly saldo: string | null;
};

/**
 * Passo 3 do envio — revisão.
 *
 * Server Component: só leitura e links. O "Enviar para curadoria" leva ao
 * placeholder da seleção (módulo 4, da R3), que é onde as Claves de fato saem
 * — aqui nada é debitado, e o aviso diz isso.
 */
export function Revisao({ faixa, saldo }: PropsRevisao) {
  const fonte = rotuloDaFonte(faixa);
  const nomeDoArquivo = faixa.arquivoCaminho?.split('/').pop() ?? '';

  const rotuloDaFonteTexto =
    fonte === 'arquivo'
      ? TEXTOS.resumoFonte.arquivo(nomeDoArquivo)
      : fonte === 'link'
        ? TEXTOS.resumoFonte.link
        : TEXTOS.resumoFonte.manual;

  return (
    <div className={estilos.base}>
      <Painel titulo={TEXTOS.resumoFaixa}>
        <dl className={estilos.lista}>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.rotuloTitulo}</dt>
            <dd className={estilos.valor}>{faixa.titulo}</dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.rotuloGenero}</dt>
            <dd className={estilos.valor}>{faixa.genero}</dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.enviarArquivo}</dt>
            <dd className={estilos.valor}>{rotuloDaFonteTexto}</dd>
          </div>
        </dl>
      </Painel>

      <Painel titulo={TEXTOS.resumoContexto} nivel={3}>
        <p className={estilos.contexto}>{faixa.contextoCurador}</p>
      </Painel>

      {saldo !== null ? (
        <Aviso tom="info" estatico>
          {TEXTOS.avisoSelecao(saldo)}
        </Aviso>
      ) : null}

      <div className={estilos.acoes}>
        <BotaoLink href={`${ROTA.ARTISTA_ENVIAR}/${faixa.id}/contexto`} variante="secundario">
          {TEXTOS.voltar}
        </BotaoLink>
        <BotaoLink href={`${ROTA.ARTISTA_ENVIAR}/${faixa.id}/curadores`}>
          {TEXTOS.enviarParaCuradoria}
        </BotaoLink>
      </div>
    </div>
  );
}
