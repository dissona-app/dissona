import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import estilos from './Botao.module.css';
import type { TamanhoBotao, VarianteBotao } from './Botao';

export type PropsBotaoLink = Omit<ComponentProps<typeof Link>, 'className' | 'children'> & {
  readonly variante?: VarianteBotao;
  readonly tamanho?: TamanhoBotao;
  readonly blocoInteiro?: boolean;
  readonly children: ReactNode;
};

/**
 * Navegação com a aparência de botão.
 *
 * Existe porque "Novo pacote" e "Voltar para os pacotes" **navegam**, e o
 * protótipo os desenha como botão. Fazer isso com `<Botao onClick={() =>
 * router.push(...)}>` custa três coisas concretas: some do menu de contexto
 * ("abrir em nova aba"), some do `Ctrl`+clique e obriga JavaScript para uma
 * navegação que o navegador faz sozinho. O elemento certo para ir a outro
 * lugar é `<a>`; o botão é para agir aqui.
 *
 * Compartilha o `Botao.module.css` — o mesmo estilo, sem uma segunda cópia que
 * derive com o tempo.
 */
export function BotaoLink({
  variante = 'primario',
  tamanho = 'md',
  blocoInteiro = false,
  children,
  ...resto
}: PropsBotaoLink) {
  const classes = [
    estilos.base,
    estilos[variante],
    variante === 'ghost' || variante === 'destrutivo' ? estilos.semPadding : estilos[tamanho],
    blocoInteiro ? estilos.blocoInteiro : undefined,
    estilos.comoLink,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link {...resto} className={classes}>
      {children}
    </Link>
  );
}
