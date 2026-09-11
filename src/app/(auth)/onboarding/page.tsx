import type { Metadata } from 'next';

import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { TourDeOnboarding } from '@/componentes/autenticacao/TourDeOnboarding';
import type { PassoDoTour } from '@/componentes/autenticacao/TourDeOnboarding';
import { ROTA } from '@/lib/guarda-rota';
import { Papel } from '@/lib/papeis';
import { encerrarOnboarding } from '@/modulos/autenticacao/acoes';
import { lerContextoDaSessao } from '@/modulos/autenticacao/consultas';
import { ONBOARDING } from '@/textos/prototipo';

export const metadata: Metadata = {
  title: 'Como a Dissona funciona · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 1.5 — onboarding por ambiente (RF-007).
 *
 * Fica em `(auth)`, fora do shell, porque o protótipo o desenha como uma tela
 * cheia e não como conteúdo de painel — e porque no primeiro acesso ainda não
 * há o que navegar na sidebar.
 *
 * O conteúdo é escolhido pelo papel da conta, com a mesma prioridade do
 * roteamento. Quem tem os dois papéis vê o tour do artista: é o ambiente em que
 * ele vai cair, e mostrar o do curador seria explicar uma tela que ele não abriu.
 *
 * `?rever=1` vem do menu de ajuda. A diferença é só o botão "Pular", que sai —
 * quem reabriu já conhece o tour.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly rever?: string }>;
}) {
  const { rever } = await searchParams;
  const contexto = await lerContextoDaSessao();

  const papeis = contexto.estado === 'ok' ? contexto.papeis : [];
  const passos = passosDoPapel(papeis);

  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <TourDeOnboarding
        passos={passos}
        acaoDeEncerrar={encerrarOnboarding}
        revendo={rever === '1'}
      />
    </MolduraDeAutenticacao>
  );
}

function passosDoPapel(papeis: readonly Papel[]): readonly PassoDoTour[] {
  if (papeis.includes(Papel.ARTISTA)) return ONBOARDING.artista;
  if (papeis.includes(Papel.CURADOR)) return ONBOARDING.curador;
  if (papeis.includes(Papel.ADMIN)) return ONBOARDING.admin;
  // A guarda de rota não deixa chegar aqui sem papel; se chegar, o tour do
  // artista é o mais provável e não promete nada que dependa de papel.
  return ONBOARDING.artista;
}
