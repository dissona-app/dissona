import type { ReactNode } from 'react';

import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { Passos } from '@/componentes/base/Passos';
import { PASSO_NO_INDICADOR } from '@dissona/nucleo/modulos/avaliacao/tipos';
import type { PassoDaAvaliacao } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import { capaDoEnvio } from '../capas';

import estilos from './MolduraDaAvaliacao.module.css';

/**
 * O `id` do `<form>` de cada etapa.
 *
 * Constante e não gerado: "Salvar e sair" mora no **cabeçalho**, fora do
 * formulário, e o atributo `form` é o que o liga a ele. Sem um id conhecido, o
 * botão precisaria ou descer para o rodapé — o protótipo o põe em cima — ou
 * virar um `onClick` que monta o envio à mão.
 */
export const ID_DO_FORMULARIO = 'avaliacao-passo';

export type PropsMolduraDaAvaliacao = {
  readonly titulo: string;
  readonly artista: string;
  /** Para a capa do cartão da faixa — a mesma da Fila e do detalhe. */
  readonly envioId?: string;
  readonly passo: PassoDaAvaliacao;
  /**
   * Concluída, não há mais o que salvar nem para onde voltar: o cabeçalho
   * perde o "Salvar e sair" e o indicador fica todo preenchido.
   */
  readonly concluida?: boolean;
  readonly children: ReactNode;
};

/**
 * Moldura das cinco etapas (14 · 14.1 · 14.2 · 14.3 · 14.4).
 *
 * Server Component: o indicador sai da rota, não de estado.
 *
 * ## Quatro marcas para cinco etapas
 *
 * "Outras formas" (14.3) não acende marca própria — ela é a continuação de
 * Compartilhamento, e o protótipo a agrupa ali (`avStep >= 4 ? 3 : …`). Dar-lhe
 * uma quinta marca faria o indicador mudar de tamanho conforme a modalidade
 * escolhida, que é pior do que a assimetria. O mapa está em
 * `PASSO_NO_INDICADOR`.
 */
export function MolduraDaAvaliacao({
  titulo,
  artista,
  envioId,
  passo,
  concluida = false,
  children,
}: PropsMolduraDaAvaliacao) {
  const atual = concluida ? AVALIAR.passos.length : PASSO_NO_INDICADOR[passo];

  // Protótipo aprovado: os passos e o "Salvar e sair" numa linha; abaixo, o
  // cartão da faixa preso à esquerda e o passo à direita.
  const capa = envioId === undefined ? null : capaDoEnvio(envioId);
  return (
    <div className={estilos.base}>
      <div className={estilos.topo}>
        <div className={estilos.passos}>
          <Passos passos={[...AVALIAR.passos]} atual={atual} rotulo="Etapas da avaliação" />
        </div>
        {concluida ? null : (
          <Botao
            type="submit"
            variante="ghost"
            tamanho="sm"
            form={ID_DO_FORMULARIO}
            name="destino"
            value="sair"
            // Sair não é concluir: a validação nativa do passo barraria quem
            // quer justamente interromper antes de preencher tudo.
            formNoValidate
          >
            {AVALIAR.salvarESair}
          </Botao>
        )}
      </div>

      <div className={estilos.grade}>
        <aside className={estilos.lateral}>
          <div className={estilos.cartao}>
            {capa === null ? null : (
              <span
                className={estilos.fundo}
                style={{ backgroundImage: `url('${capa}')` }}
                aria-hidden="true"
              />
            )}
            <span className={estilos.veu} aria-hidden="true" />
            <div className={estilos.cartaoCorpo}>
              <span
                className={estilos.capa}
                style={capa === null ? undefined : { backgroundImage: `url('${capa}')` }}
                aria-hidden="true"
              />
              <div className={estilos.faixa}>
                <h2 className={estilos.titulo}>{titulo}</h2>
                <p className={estilos.artista}>{artista}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className={estilos.conteudo}>{children}</div>
      </div>
    </div>
  );
}
