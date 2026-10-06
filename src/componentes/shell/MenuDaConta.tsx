'use client';

import Link from 'next/link';

import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';
import { ADMIN_NAVEGACAO, MENU_DA_CONTA } from '@/textos/prototipo';

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
  /** Foto de perfil; sem ela, o avatar mostra as iniciais. */
  readonly fotoUrl?: string | null;
};

export type PropsMenuDaConta = {
  readonly identidade: IdentidadeExibida;
  readonly acaoDeSair: () => Promise<void>;
  readonly papelAtivo: Papel;
  /** Todos os papéis ativos da conta — decide se a troca de ambiente aparece. */
  readonly papeis: readonly Papel[];
};

/** O atalho para a Conta, por ambiente — destino e rótulo literais do protótipo. */
const CONTA_DO_AMBIENTE: Record<Papel, { readonly href: string; readonly rotulo: string }> = {
  artista: { href: ROTA.ARTISTA_CONTA, rotulo: MENU_DA_CONTA.configuracoes },
  // "Configurações" também no curador: é o rótulo do **dropdown** no protótipo,
  // e não o da sidebar ("Conta e configurações"). São dois lugares para a mesma
  // tela, com dois nomes, e cada um segue o seu.
  curador: { href: ROTA.CURADOR_CONTA, rotulo: MENU_DA_CONTA.configuracoes },
  admin: { href: ROTA.ADMIN_EQUIPE, rotulo: ADMIN_NAVEGACAO.contaEEquipe },
};

/** Para onde a troca de ambiente leva, e com que rótulo. */
const OUTRO_AMBIENTE: Partial<Record<Papel, { readonly href: string; readonly rotulo: string }>> = {
  artista: { href: ROTA.CURADOR, rotulo: MENU_DA_CONTA.verComoCurador },
  curador: { href: ROTA.ARTISTA, rotulo: MENU_DA_CONTA.verComoArtista },
};

/**
 * O dropdown do avatar — o "AM / Aurora" do protótipo.
 *
 * ## Os itens são os do protótipo, na ordem dele
 *
 * | | Itens |
 * |---|---|
 * | Artista | `Ver como curador` · — · `Configurações` · `Rever onboarding` · — · `Sair` |
 * | Curador | `Ver como artista` · — · `Configurações` · — · `Sair` |
 * | Admin | `Conta e equipe` · — · `Sair` |
 *
 * Três decisões que essa tabela carrega:
 *
 *  - **A troca de ambiente mora aqui**, e não num controle solto no header.
 *    Era um `TrocaDePapel` ao lado do avatar — dois pares de opções
 *    segmentadas —, e o protótipo põe **um** item apontando para o outro
 *    ambiente. No protótipo ele é falso (`title="Disponível na versão final"`);
 *    aqui é o link que funciona.
 *  - **"Rever onboarding" só no artista** (RF-007, emendado em 2026-09-23): é
 *    onde o protótipo o põe. O curador reabre o tour por `/onboarding?rever=1`,
 *    que continua valendo — ver `docs/requirements.md`.
 *  - **O bloco de nome e e-mail fica nos três**, embora o protótipo só o
 *    desenhe no admin: é onde vive o aviso de e-mail não confirmado, que é a
 *    única superfície do endereço pendente do cadastro por SoundCloud
 *    (open-questions #9). Registrado em `07-pendencias-e-divergencias.md`.
 */
export function MenuDaConta({ identidade, acaoDeSair, papelAtivo, papeis }: PropsMenuDaConta) {
  const conta = CONTA_DO_AMBIENTE[papelAtivo];
  const outro = OUTRO_AMBIENTE[papelAtivo];
  // O admin não entra na troca: é papel à parte, com login próprio (RF-008).
  const podeTrocar = outro !== undefined && papeis.filter((papel) => papel !== 'admin').length > 1;

  const itens: readonly ItemMenu[] = [
    ...(podeTrocar && outro !== undefined ? [{ rotulo: outro.rotulo, href: outro.href }] : []),
    { rotulo: conta.rotulo, href: conta.href, separadorAntes: podeTrocar },
    ...(papelAtivo === 'artista'
      ? [{ rotulo: MENU_DA_CONTA.reverOnboarding, href: `${ROTA.ONBOARDING}?rever=1` }]
      : []),
    { rotulo: MENU_DA_CONTA.sair, acao: acaoDeSair, separadorAntes: true },
  ];

  return (
    <MenuAjuda
      rotulo={`Conta de ${identidade.nome}`}
      disparador={
        <>
          <span className={estilos.avatar} aria-hidden="true">
            {identidade.fotoUrl ? (
              // `<img>` e não `next/image`, como no `CampoDeFoto`: a URL é do
              // Storage, e o otimizador exigiria `remotePatterns` para um
              // avatar de 28 px.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={estilos.foto} src={identidade.fotoUrl} alt="" />
            ) : (
              identidade.iniciais
            )}
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
