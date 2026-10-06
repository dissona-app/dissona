'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { Papel } from '@/lib/papeis';

import { useCaminhoInterno } from './BaseDoAdmin';
import { MenuDaConta } from './MenuDaConta';
import type { IdentidadeExibida } from './MenuDaConta';
import { Navegacao } from './Navegacao';
import { RegistrarAmbiente } from './RegistrarAmbiente';
import estilos from './Shell.module.css';
import { tituloDoCaminho } from './titulo-por-caminho';

export type LimiteConteudo = 'total' | 'conta' | 'contaAdmin' | 'formulario' | 'passo';

export type PropsShell = {
  readonly papelAtivo: Papel;
  /** Todos os papéis ativos da conta — decide se a troca aparece. */
  readonly papeis: readonly Papel[];
  /**
   * Título do header. Quando omitido, sai de `tituloDoCaminho()` — que é como
   * o protótipo faz: o título é propriedade da rota, não da tela.
   */
  readonly titulo?: string;
  /** Sublegenda sob o título — o `appSub` do protótipo. */
  readonly subtitulo?: string;
  /** Release em execução; item de release futura fica desabilitado na nav. */
  readonly releaseAtual?: number;
  readonly limite?: LimiteConteudo;
  /** Ações extra no header, à esquerda do menu da conta. */
  readonly acoes?: ReactNode;
  /** Card de saldo no pé da sidebar. */
  readonly rodapeNavegacao?: ReactNode;
  /**
   * Identidade da conta — alimenta o menu do avatar, onde ficam "Rever
   * onboarding" e "Sair".
   *
   * Opcional para que o `Shell` continue montável sem sessão em teste. Sem ela,
   * o menu não aparece — e é melhor não aparecer do que aparecer vazio.
   */
  readonly identidade?: IdentidadeExibida;
  /** `sair` ou `sairDoAdmin`, conforme o ambiente. */
  readonly acaoDeSair?: () => Promise<void>;
  /** Registra o ambiente em uso (RF-008). Só é montado quando o valor mudou. */
  readonly registrarAmbiente?: (papel: Papel) => Promise<void>;
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
 * A busca do header — desenhada nos três protótipos, e sem nenhum módulo por
 * trás na R2.
 *
 * `disabled`, e não ausente: o protótipo põe o botão nos três ambientes, e é o
 * mesmo tratamento que a navegação já dá a item de release futura — mostrar o
 * produto inteiro sem fingir que ele já está lá. No protótipo o botão não tem
 * `on-click` nem rótulo acessível nenhum: é decoração, e implementá-lo por
 * fidelidade seria entregar um controle que não faz nada.
 */
function BotaoDeBusca() {
  return (
    <button
      type="button"
      className={estilos.busca}
      disabled
      title="A busca chega numa release futura"
      aria-label="Buscar"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
    </button>
  );
}

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
  subtitulo,
  releaseAtual = 2,
  limite = 'total',
  acoes,
  rodapeNavegacao,
  identidade,
  acaoDeSair,
  registrarAmbiente,
  children,
}: PropsShell) {
  const ehAdmin = papelAtivo === 'admin';
  const caminho = useCaminhoInterno()(usePathname());
  const doCaminho = tituloDoCaminho(caminho, papelAtivo);
  const tituloExibido = titulo ?? doCaminho.titulo;
  const subtituloExibido = subtitulo ?? doCaminho.sublegenda;

  return (
    <div className={estilos.grade}>
      {registrarAmbiente === undefined ? null : (
        <RegistrarAmbiente papel={papelAtivo} acao={registrarAmbiente} />
      )}

      <a className={estilos.atalho} href={`#${ID_CONTEUDO}`}>
        Ir para o conteúdo
      </a>

      <Navegacao papel={papelAtivo} releaseAtual={releaseAtual} rodape={rodapeNavegacao} />

      <div className={estilos.coluna}>
        <header className={estilos.header}>
          <div className={estilos.textosHeader}>
            <h1 className={estilos.titulo}>{tituloExibido}</h1>
            {subtituloExibido !== undefined ? (
              <span className={estilos.subtitulo}>{subtituloExibido}</span>
            ) : null}
          </div>

          <div className={estilos.acoesHeader}>
            {acoes}
            <BotaoDeBusca />
            {identidade !== undefined && acaoDeSair !== undefined ? (
              <MenuDaConta
                identidade={identidade}
                acaoDeSair={acaoDeSair}
                papelAtivo={papelAtivo}
                papeis={papeis}
              />
            ) : null}
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
