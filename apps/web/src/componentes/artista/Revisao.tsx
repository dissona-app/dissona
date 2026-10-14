import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { rotuloDaFonte } from '@/modulos/faixa/servico';
import type { FaixaEmEdicao } from '@/modulos/faixa/tipos';
import { ENVIAR as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import { CartaoDaFaixa } from './CartaoDaFaixa';
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
  // A origem aparece para link e preenchimento manual (RF-037). Para arquivo
  // o cartão já diz "Arquivo enviado", e o nome no Storage é um UUID.
  const fonte = rotuloDaFonte(faixa);
  const genero = faixa.genero ?? '—';
  const info =
    fonte === 'arquivo'
      ? genero
      : `${genero} · ${fonte === 'link' ? TEXTOS.resumoFonte.link : TEXTOS.resumoFonte.manual}`;

  return (
    <div className={estilos.base}>
      {/* Protótipo aprovado: o cartão da faixa em destaque e, ao lado, o que
          o artista escreveu para o curador. */}
      <div className={estilos.grade}>
        <div className={estilos.colunaFaixa}>
          <CartaoDaFaixa faixa={faixa} destaque info={info} />
        </div>
        <section className={estilos.cartaoContexto} aria-label={TEXTOS.resumoContexto}>
          <h3 className={estilos.rotuloContexto}>{TEXTOS.resumoContexto}</h3>
          <p className={estilos.contexto}>{faixa.contextoCurador}</p>
        </section>
      </div>

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
