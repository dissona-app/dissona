'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Marca } from '@dissona/nucleo/componentes/base/Marca';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { Papel } from '@dissona/nucleo/lib/papeis';

import { useCaminhoInterno, useHrefDoAdmin } from './BaseDoAdmin';
import { IconeDeNavegacao } from './IconeDeNavegacao';
import estilos from './Navegacao.module.css';
import { NAVEGACAO, NOME_AMBIENTE } from './navegacao-por-ambiente';

export type PropsNavegacao = {
  readonly papel: Papel;
  /** Release em execução. Item de release futura aparece desabilitado. */
  readonly releaseAtual: number;
  /** Card de saldo no pé da sidebar — só o ambiente do artista tem. */
  readonly rodape?: ReactNode;
};

export function Navegacao({ papel, releaseAtual, rodape }: PropsNavegacao) {
  // As tabelas da navegação são internas (`/admin/...`); no subdomínio do
  // admin o navegador vê o caminho limpo, e os dois lados são traduzidos.
  const caminhoAtual = useCaminhoInterno()(usePathname());
  const hrefDoAdmin = useHrefDoAdmin();
  const grupos = NAVEGACAO[papel];

  // "Recolher menu" do protótipo aprovado: a lateral fica só com os ícones.
  // A escolha vale para a pessoa neste navegador.
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecolhido(window.localStorage.getItem(CHAVE_RECOLHIDO) === '1');
    } catch {
      // Sem storage (aba privada), o menu abre expandido.
    }
  }, []);
  const alternar = () => {
    setRecolhido((antes) => {
      try {
        window.localStorage.setItem(CHAVE_RECOLHIDO, antes ? '0' : '1');
      } catch {
        // idem
      }
      return !antes;
    });
  };

  return (
    <aside className={estilos.aside} data-recolhido={recolhido || undefined}>
      <Link
        className={estilos.marca}
        href={papel === 'admin' ? hrefDoAdmin(ROTA.ADMIN) : ROTA.HOME}
      >
        <Marca variante="branca" altura="clamp(36px, 4.8vh, 42px)" />
      </Link>

      <nav className={estilos.grupos} aria-label={`Navegação — ${NOME_AMBIENTE[papel]}`}>
        {grupos.map((grupo, indice) => (
          <div className={estilos.grupo} key={grupo.titulo ?? `grupo-${indice}`}>
            {grupo.titulo !== null ? (
              <span className={estilos.overline}>{grupo.titulo}</span>
            ) : null}

            <ul className={estilos.lista}>
              {grupo.itens.map((item, posicao) => {
                // O fundo do item ativo gira entre lilás, pêssego e lavanda
                // pela posição do item no menu (protótipo aprovado, `NAVC`).
                const ordem =
                  grupos.slice(0, indice).reduce((soma, g) => soma + g.itens.length, 0) + posicao;
                // Exato para a raiz do ambiente; por prefixo nas subrotas,
                // para que `/artista/carteira/extrato` mantenha "Carteira"
                // marcada.
                const raizDoAmbiente =
                  item.caminho ===
                  ROTA[papel === 'admin' ? 'ADMIN' : papel === 'artista' ? 'ARTISTA' : 'CURADOR'];
                // O status de um envio é "Minhas faixas" no protótipo aprovado.
                const ehStatus =
                  caminhoAtual.startsWith(`${ROTA.ARTISTA_ENVIAR}/`) &&
                  caminhoAtual.endsWith('/status');
                const ativo = ehStatus
                  ? item.caminho === `${ROTA.ARTISTA}/faixas`
                  : raizDoAmbiente
                    ? caminhoAtual === item.caminho
                    : caminhoAtual === item.caminho || caminhoAtual.startsWith(`${item.caminho}/`);

                // `motivo` desabilita o item mesmo quando a release já chegou:
                // é o caso de uma tela que existe e não tem endereço próprio.
                const disponivel = item.release <= releaseAtual && item.motivo === undefined;

                return (
                  <li key={item.caminho}>
                    {disponivel ? (
                      <Link
                        className={[estilos.item, ativo ? estilos.ativo : undefined]
                          .filter(Boolean)
                          .join(' ')}
                        href={hrefDoAdmin(item.caminho)}
                        aria-current={ativo ? 'page' : undefined}
                        data-cor={(item.cor ?? ordem) % 3}
                        title={recolhido ? item.rotulo : undefined}
                      >
                        <IconeDeNavegacao nome={item.icone} ativo={ativo} />
                        <span className={estilos.rotulo}>{item.rotulo}</span>
                        <IndicadorDeNavegacao />
                      </Link>
                    ) : (
                      // Item de release futura. O protótipo aprovado o desenha
                      // igual aos outros, e é assim que ele aparece; não
                      // navega, e o `title` e o texto para leitor de tela
                      // dizem por quê.
                      <span
                        className={[
                          estilos.item,
                          estilos.indisponivel,
                          ativo ? estilos.ativo : undefined,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        data-cor={(item.cor ?? ordem) % 3}
                        aria-disabled="true"
                        title={item.motivo ?? `Disponível na Release ${item.release}`}
                      >
                        <IconeDeNavegacao nome={item.icone} ativo={ativo} />
                        <span className={estilos.rotulo}>{item.rotulo}</span>
                        <span className="dsn-apenas-leitor">
                          {` — ${item.motivo ?? `disponível na Release ${item.release}`}`}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={estilos.espaco} aria-hidden="true" />

      {rodape !== undefined ? <div className={estilos.rodape}>{rodape}</div> : null}

      <button
        type="button"
        className={estilos.recolher}
        onClick={alternar}
        aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!recolhido}
        title={recolhido ? 'Expandir menu' : undefined}
      >
        <IconeDeNavegacao nome="recolher" />
        <span className={estilos.rotulo}>Recolher menu</span>
      </button>
    </aside>
  );
}

const CHAVE_RECOLHIDO = 'dsn-menu-recolhido';

/**
 * O retorno imediato do clique: enquanto a rota seguinte carrega, o item
 * clicado mostra um spinner. Complementa o `loading.tsx` de cada ambiente, que
 * cuida do miolo; este cuida de onde a pessoa acabou de clicar.
 */
function IndicadorDeNavegacao() {
  const { pending } = useLinkStatus();
  return pending ? <span className={estilos.pendente} aria-hidden="true" /> : null;
}
