import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TelaDeConta, ehAbaDeConta } from '@/componentes/conta/TelaDeConta';
import { ROTA } from '@/lib/guarda-rota';
import { lerContextoDaSessao, lerIdentidadeDaSessao } from '@/modulos/autenticacao/consultas';
import { lerSessoesDaConta } from '@/modulos/conta/consultas';
import { lerPreferencias } from '@/modulos/preferencias/consultas';

export const metadata: Metadata = {
  title: 'Configurações · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Conta e configurações do artista — telas 7.2 e 7.4.
 *
 * A aba vem de `?aba=`, e não de estado no cliente: ver o comentário do
 * componente `Abas` sobre por que ela precisa de endereço. Um valor inventado
 * na URL cai em "Dados da conta" em vez de 404 — a página existe, e o que está
 * errado é só qual das três seções abrir.
 *
 * As sessões só são lidas quando a aba de segurança está aberta. É a razão
 * prática de a aba ser rota: quem entra em "Dados da conta" não paga uma RPC
 * que talvez nunca veja.
 *
 * Sem `<h1>`: o `Shell` já põe o da rota ("Configurações").
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly aba?: string }>;
}) {
  const { aba: bruta } = await searchParams;
  const aba = ehAbaDeConta(bruta, 'artista') ? bruta : 'dados';

  const [contexto, identidade] = await Promise.all([
    lerContextoDaSessao(),
    lerIdentidadeDaSessao(),
  ]);

  // A guarda de rota já exige sessão; chegar aqui sem ela é sessão perdida
  // entre o middleware e o render.
  if (contexto.estado !== 'ok' || identidade === null) redirect(ROTA.ENTRAR);

  const sessoes = aba === 'seguranca' ? await lerSessoesDaConta() : [];
  const preferencias = aba === 'preferencias' ? await lerPreferencias('artista') : null;

  return (
    <TelaDeConta
      ambiente="artista"
      caminho={ROTA.ARTISTA_CONTA}
      aba={aba}
      email={identidade.email}
      papeis={contexto.papeis}
      sessoes={sessoes}
      preferencias={preferencias}
    />
  );
}
