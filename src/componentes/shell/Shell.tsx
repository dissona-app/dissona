'use client';

import type { ReactNode } from 'react';

import type { Papel } from '@/lib/papeis';

import { MenuAjuda } from './MenuAjuda';
import { Navegacao } from './Navegacao';
import estilos from './Shell.module.css';
import { TrocaDePapel } from './TrocaDePapel';

export type LimiteConteudo = 'total' | 'conta' | 'contaAdmin' | 'formulario' | 'passo';

export type PropsShell = {
  readonly papelAtivo: Papel;
  /** Todos os papéis ativos da conta — decide se a troca aparece. */
  readonly papeis: readonly Papel[];
  readonly titulo: string;
  /** Release em execução; item de release futura fica desabilitado na nav. */
  readonly releaseAtual?: number;
  readonly limite?: LimiteConteudo;
  /** Ações extra no header, à esquerda do menu de ajuda. */
  readonly acoes?: ReactNode;
  /** Card de saldo no pé da sidebar. */
  readonly rodapeNavegacao?: ReactNode;
  readonly onReverOnboarding?: () => void;
  readonly children: ReactNode;
};

const CLASSE_LIMITE: Record<LimiteConteudo, string | undefined> = {
  total: undefined,
  conta: estilos.limiteConta,
  contaAdmin: estilos.limiteContaAdmin,
  formulario: estilos.limiteFormulario,
  passo: estilos.limitePasso,
};

const ID_CONTEUDO = 'conteudo-principal';

/**
 * Shell do ambiente autenticado (design-system.md §3.2).
 *
 * Grade de `260px 1fr`, sidebar sticky com gradiente roxo, header translúcido
 * e `<main>` com o padding medido no protótipo — o do admin é mais compacto.
 *
 * Traz um atalho "Ir para o conteúdo" que o protótipo não tem: sem ele, quem
 * navega por teclado atravessa os ~15 itens da sidebar em cada troca de página
 * (§4.3).
 */
export function Shell({
  papelAtivo,
  papeis,
  titulo,
  releaseAtual = 2,
  limite = 'total',
  acoes,
  rodapeNavegacao,
  onReverOnboarding,
  children,
}: PropsShell) {
  const ehAdmin = papelAtivo === 'admin';

  const itensDeAjuda =
    onReverOnboarding === undefined
      ? []
      : [{ rotulo: 'Rever onboarding', onAcionar: onReverOnboarding }];

  return (
    <div className={estilos.grade}>
      <a className={estilos.atalho} href={`#${ID_CONTEUDO}`}>
        Ir para o conteúdo
      </a>

      <Navegacao papel={papelAtivo} releaseAtual={releaseAtual} rodape={rodapeNavegacao} />

      <div className={estilos.coluna}>
        <header className={estilos.header}>
          <h1 className={estilos.titulo}>{titulo}</h1>

          <div className={estilos.acoesHeader}>
            <TrocaDePapel papelAtivo={papelAtivo} papeis={papeis} />
            {acoes}
            {itensDeAjuda.length > 0 ? <MenuAjuda itens={itensDeAjuda} /> : null}
          </div>
        </header>

        <main
          id={ID_CONTEUDO}
          className={[ehAdmin ? estilos.conteudoAdmin : estilos.conteudo, CLASSE_LIMITE[limite]]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
