import Image from 'next/image';

import horizontalBranco from '../../../public/marca/dissona-horizontal-branco.png';
import horizontal from '../../../public/marca/dissona-horizontal.png';

import estilos from './Marca.module.css';

export type PropsMarca = {
  /**
   * `colorida` sobre fundo claro (telas de autenticação), `branca` sobre o
   * gradiente escuro da sidebar. São dois PNGs diferentes no protótipo, e não
   * um filtro CSS: a versão branca é chapada, sem o laranja da onda.
   */
  readonly variante: 'colorida' | 'branca';
  /** Altura renderizada. Vem do protótipo, por composição — ver os chamadores. */
  readonly altura: string;
  readonly className?: string;
};

/**
 * O logotipo da Dissona.
 *
 * O arquivo é o do protótipo, extraído do manifest de assets dos `.html` da R2
 * por [`scripts/extrair-imagens-prototipo.mjs`](../../../scripts/extrair-imagens-prototipo.mjs).
 * Antes daqui a implementação desenhava um quadrado com `--dsn-grad-brand-diag`
 * ao lado da palavra "Dissona" — aproximação que nunca esteve no protótipo.
 *
 * O `alt` é `"Dissona"`, o mesmo das seis `<img>` do protótipo: o logotipo é a
 * única aparição do nome na tela, então ele precisa ser lido. Quando a marca
 * vira link, quem nomeia o link é este texto.
 *
 * A altura chega por prop e a largura sai da proporção do PNG (7959×2278). É o
 * que o protótipo faz em todas as aparições — `height:…; width:auto` —, e os
 * valores mudam por tela, então fixar um aqui obrigaria o chamador a desfazê-lo.
 */
export function Marca({ variante, altura, className }: PropsMarca) {
  return (
    <Image
      // `priority`: a marca está acima da dobra em toda tela onde aparece, e é
      // o maior elemento pintado das telas de autenticação.
      priority
      // O PNG do protótipo tem 7959px de largura e a marca nunca passa de
      // ~210px na tela. Sem `sizes`, o `next/image` derivaria a variante a
      // servir da largura declarada e mandaria a de 3840px.
      sizes="256px"
      src={variante === 'branca' ? horizontalBranco : horizontal}
      alt="Dissona"
      className={[estilos.marca, className].filter(Boolean).join(' ')}
      style={{ height: altura }}
    />
  );
}
