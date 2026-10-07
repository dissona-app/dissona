'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Marca } from '@dissona/nucleo/componentes/base/Marca';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { Papel } from '@dissona/nucleo/lib/papeis';

import { useCaminhoInterno, useHrefDoAdmin } from './BaseDoAdmin';
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

  return (
    <aside className={estilos.aside}>
      <Link
        className={estilos.marca}
        href={papel === 'admin' ? hrefDoAdmin(ROTA.ADMIN) : ROTA.HOME}
      >
        <Marca variante="branca" altura="clamp(28px, 3.8vh, 34px)" />
      </Link>

      <nav className={estilos.grupos} aria-label={`Navegação — ${NOME_AMBIENTE[papel]}`}>
        {grupos.map((grupo, indice) => (
          <div className={estilos.grupo} key={grupo.titulo ?? `grupo-${indice}`}>
            {grupo.titulo !== null ? (
              <span className={estilos.overline}>{grupo.titulo}</span>
            ) : null}

            <ul className={estilos.lista}>
              {grupo.itens.map((item) => {
                // Exato para a raiz do ambiente; por prefixo nas subrotas,
                // para que `/artista/carteira/extrato` mantenha "Carteira"
                // marcada.
                const raizDoAmbiente =
                  item.caminho ===
                  ROTA[papel === 'admin' ? 'ADMIN' : papel === 'artista' ? 'ARTISTA' : 'CURADOR'];
                const ativo = raizDoAmbiente
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
                      >
                        <span className={estilos.rotulo}>{item.rotulo}</span>
                        <IndicadorDeNavegacao />
                      </Link>
                    ) : (
                      // Item de release futura: visível para dar noção do
                      // produto inteiro, mas não navegável. `aria-disabled`
                      // em vez de remover do DOM, para a navegação não mudar
                      // de forma a cada entrega. O selo "Em breve" é o aviso
                      // visível — só o `title` parecia um botão quebrado.
                      <span
                        className={[estilos.item, estilos.indisponivel].join(' ')}
                        aria-disabled="true"
                        title={item.motivo ?? `Disponível na Release ${item.release}`}
                      >
                        <span className={estilos.rotulo}>{item.rotulo}</span>
                        <span className={estilos.emBreve} aria-hidden="true">
                          Em breve
                        </span>
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

      {rodape !== undefined ? <div className={estilos.rodape}>{rodape}</div> : null}
    </aside>
  );
}

/**
 * O retorno imediato do clique: enquanto a rota seguinte carrega, o item
 * clicado mostra um spinner. Complementa o `loading.tsx` de cada ambiente, que
 * cuida do miolo; este cuida de onde a pessoa acabou de clicar.
 */
function IndicadorDeNavegacao() {
  const { pending } = useLinkStatus();
  return pending ? <span className={estilos.pendente} aria-hidden="true" /> : null;
}
