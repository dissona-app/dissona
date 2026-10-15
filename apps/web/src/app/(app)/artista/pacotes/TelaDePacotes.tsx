import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import Link from 'next/link';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { PACOTES as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './TelaDePacotes.module.css';

/** Um card da vitrine, **já formatado no servidor**. */
export type PacoteNaVitrine = {
  readonly id: string;
  readonly nome: string;
  readonly quantidade: string;
  readonly preco: string;
  /** "15% de desconto" ou "Sem desconto" — o `p.eyebrow` do protótipo. */
  readonly chamada: string;
  readonly porClave: string;
};

export type PropsTelaDePacotes = {
  readonly pacotes: readonly PacoteNaVitrine[];
  readonly simulado: boolean;
  /** "R$ 10" — o valor da Clave, de `configuracao`. */
  readonly umaClave: string;
};

/**
 * 5.1 · Pacotes de Claves.
 *
 * O protótipo põe um selo "Mais escolhido" no pacote de 60 Claves, fixo no
 * código do mock (`p[0] === 60`). Ele não está aqui: "mais escolhido" é uma
 * afirmação sobre vendas, e não há de onde tirá-la — `pedido_clave` existe,
 * mas contar pedidos para destacar um card é uma consulta que ninguém pediu e
 * um número que ninguém conferiu. Destacar o de 60 porque o mock destacava
 * seria inventar uma estatística.
 */
export function TelaDePacotes({ pacotes, umaClave }: PropsTelaDePacotes) {
  return (
    <div className={estilos.base}>
      <Link href={ROTA.ARTISTA_CARTEIRA} className={estilos.voltar}>
        <span aria-hidden="true">‹</span> {TEXTOS.voltarParaCarteira}
      </Link>

      <p className={estilos.chamada}>{`1 Clave = ${umaClave}. O crédito não expira.`}</p>

      {pacotes.length === 0 ? (
        <EstadoVazio
          titulo={TEXTOS.vazioTitulo}
          descricao={TEXTOS.vazioDescricao}
          acao={
            <BotaoLink href={ROTA.ARTISTA_CARTEIRA} variante="secundario">
              {TEXTOS.voltarParaCarteira}
            </BotaoLink>
          }
        />
      ) : (
        <ul className={estilos.grade}>
          {pacotes.map((pacote) => (
            <li key={pacote.id} className={estilos.cartao}>
              <p className={estilos.chamadaCard}>{pacote.chamada}</p>

              <p className={estilos.quantidade}>
                {pacote.quantidade} <span className={estilos.unidade}>{TEXTOS.unidade}</span>
              </p>

              <p className={estilos.preco}>{pacote.preco}</p>
              <p className={estilos.porClave}>{pacote.porClave}</p>

              {/* O nome do pacote fica como rótulo acessível do link, senão a
                  tela teria quatro "Escolher" indistinguíveis. */}
              <Link
                className={estilos.escolher}
                href={`${ROTA.ARTISTA_PACOTES}/${pacote.id}`}
                aria-label={`${TEXTOS.escolher} — ${pacote.nome}, ${pacote.quantidade} ${TEXTOS.unidade}`}
              >
                {TEXTOS.escolher}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
