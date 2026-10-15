import { capaDoEnvio } from '@/componentes/curador/capas';
import type { FaixaEmEdicao } from '@/modulos/faixa/tipos';

import estilos from './CartaoDaFaixa.module.css';

/**
 * O cartão da faixa dos passos 2 e 3 do envio — protótipo aprovado: a capa
 * com o disco de vinil saindo por trás, o fundo desfocado na cor da capa, a
 * origem (arquivo, Spotify, YouTube), o título e a linha de informação.
 *
 * A capa é a que o link detectou; sem ela, um dos discos do protótipo,
 * escolhido pelo id da faixa — o mesmo critério da Fila.
 */
export function CartaoDaFaixa({
  faixa,
  info,
  destaque = false,
}: {
  readonly faixa: FaixaEmEdicao;
  readonly info: string;
  /** Na revisão o cartão é o centro da tela: capa à esquerda, textos ao lado. */
  readonly destaque?: boolean;
}) {
  const capa = faixa.metadadosDetectados?.capaUrl ?? capaDoEnvio(faixa.id);
  const fonte =
    faixa.origem === 'arquivo'
      ? 'Arquivo enviado'
      : faixa.urlSpotify !== null
        ? 'Spotify'
        : faixa.urlYoutube !== null
          ? 'YouTube'
          : 'Link';

  return (
    <div
      className={[estilos.base, destaque ? estilos.destaque : undefined].filter(Boolean).join(' ')}
    >
      <span
        className={estilos.fundo}
        style={{ backgroundImage: `url('${capa}')` }}
        aria-hidden="true"
      />
      <span className={estilos.veu} aria-hidden="true" />
      <div className={estilos.corpo}>
        <div className={estilos.arte} aria-hidden="true">
          <span className={estilos.vinil}>
            <span className={estilos.brilho} />
            <span className={estilos.selo} style={{ backgroundImage: `url('${capa}')` }} />
            <span className={estilos.furo} />
          </span>
          <span className={estilos.capa} style={{ backgroundImage: `url('${capa}')` }} />
        </div>
        <div className={estilos.textos}>
          <span className={estilos.fonte}>{fonte}</span>
          <span className={estilos.titulo}>{faixa.titulo}</span>
          <span className={estilos.info}>{info}</span>
        </div>
      </div>
    </div>
  );
}
