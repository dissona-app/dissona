'use client';

import Link from 'next/link';

import { ROTA } from '@/lib/guarda-rota';

import { MenuAjuda } from './MenuAjuda';
import type { ItemMenu } from './MenuAjuda';
import estilos from './MenuDaConta.module.css';

export type IdentidadeExibida = {
  readonly nome: string;
  readonly email: string;
  /**
   * O endereço ainda não foi confirmado pelo link — conta criada por provedor
   * que não devolve e-mail. Sem esta marca, o menu mostraria como definitivo um
   * endereço que ainda pode não existir.
   */
  readonly emailPendente?: boolean;
  readonly iniciais: string;
};

export type PropsMenuDaConta = {
  readonly identidade: IdentidadeExibida;
  readonly acaoDeSair: () => Promise<void>;
  /** `false` no ambiente admin, cujo onboarding é a versão enxuta e opcional. */
  readonly ofereceOnboarding?: boolean;
};

/**
 * O dropdown do avatar — o "AM / Aurora" do protótipo.
 *
 * ## Por que ele entrou junto com a autenticação
 *
 * Duas coisas dele são desta fatia, e as duas estavam sem casa:
 *
 *  - **"Sair"**. As ações `sair` e `sairDoAdmin` existem desde a R0 e
 *    **nenhuma UI as chamava** — o produto não tinha como encerrar sessão. Não
 *    é polimento: sem isso não se troca de conta, e testar os três ambientes
 *    exige limpar cookie na mão.
 *  - **"Rever onboarding"** (RF-007). O `Shell` já tinha o gancho preparado
 *    para ele, apontando para o menu de ajuda.
 *
 * O protótipo põe os dois aqui, no menu do avatar, e não no "?" de ajuda — e
 * está certo: "Sair" num menu de ajuda seria um alvo perigoso num lugar
 * inesperado.
 *
 * "Ver como curador"/"Ver como artista" ficam de fora: no protótipo eles
 * disparam o toast *"disponível na versão final"*, e a troca real já existe no
 * `TrocaDePapel` do header, ao lado. Dois controles para a mesma coisa, um deles
 * falso, é pior que um só que funciona.
 */
export function MenuDaConta({
  identidade,
  acaoDeSair,
  ofereceOnboarding = true,
}: PropsMenuDaConta) {
  const itens: readonly ItemMenu[] = [
    ...(ofereceOnboarding
      ? [{ rotulo: 'Rever onboarding', href: `${ROTA.ONBOARDING}?rever=1` }]
      : []),
    { rotulo: 'Sair', acao: acaoDeSair },
  ];

  return (
    <MenuAjuda
      rotulo={`Conta de ${identidade.nome}`}
      disparador={
        <>
          <span className={estilos.avatar} aria-hidden="true">
            {identidade.iniciais}
          </span>
          <span className={estilos.nome}>{identidade.nome}</span>
        </>
      }
      cabecalho={
        <>
          <span className={estilos.cabecalhoNome}>{identidade.nome}</span>
          <span className={estilos.cabecalhoEmail}>{identidade.email}</span>
          {identidade.emailPendente === true ? (
            <Link className={estilos.pendencia} href={ROTA.VERIFICAR_EMAIL}>
              E-mail não confirmado — confirmar
            </Link>
          ) : null}
        </>
      }
      itens={itens}
    />
  );
}
