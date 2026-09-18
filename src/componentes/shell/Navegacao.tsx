'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Marca } from '@/componentes/base/Marca';
import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';

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
  const caminhoAtual = usePathname();
  const grupos = NAVEGACAO[papel];

  return (
    <aside className={estilos.aside}>
      <Link className={estilos.marca} href={ROTA.HOME}>
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
                        href={item.caminho}
                        aria-current={ativo ? 'page' : undefined}
                      >
                        {item.rotulo}
                      </Link>
                    ) : (
                      // Item de release futura: visível para dar noção do
                      // produto inteiro, mas não navegável. `aria-disabled`
                      // em vez de remover do DOM, para a navegação não mudar
                      // de forma a cada entrega.
                      <span
                        className={estilos.item}
                        aria-disabled="true"
                        title={item.motivo ?? `Disponível na Release ${item.release}`}
                      >
                        {item.rotulo}
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
