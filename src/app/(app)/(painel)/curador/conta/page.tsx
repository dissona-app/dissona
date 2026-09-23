import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TelaDeConta, ehAbaDeConta } from '@/componentes/conta/TelaDeConta';
import { ROTA } from '@/lib/guarda-rota';
import { lerContextoDaSessao, lerIdentidadeDaSessao } from '@/modulos/autenticacao/consultas';
import { lerSessoesDaConta } from '@/modulos/conta/consultas';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import { lerPreferencias } from '@/modulos/preferencias/consultas';

export const metadata: Metadata = {
  title: 'Conta e configurações · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Conta e configurações do curador — telas 17.2 e 17.4.
 *
 * Mesma tela do artista, com o bloco financeiro do recebimento no lugar do de
 * cobrança e sem o convite a ativar o papel de curador — ver o comentário de
 * `TelaDeConta` sobre por que é um componente só. As decisões de aba por URL e
 * de leitura condicional das sessões estão documentadas na página do artista.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly aba?: string }>;
}) {
  const { aba: bruta } = await searchParams;
  const aba = ehAbaDeConta(bruta, 'curador') ? bruta : 'dados';

  const [contexto, identidade] = await Promise.all([
    lerContextoDaSessao(),
    lerIdentidadeDaSessao(),
  ]);

  if (contexto.estado !== 'ok' || identidade === null) redirect(ROTA.CURADOR_ENTRAR);

  // Cada leitura só na aba que a usa — a mesma decisão já aplicada às sessões.
  const sessoes = aba === 'seguranca' ? await lerSessoesDaConta() : [];
  const cadastroDoCurador = aba === 'perfil' ? await lerCadastroDoCurador() : null;
  const preferencias = aba === 'preferencias' ? await lerPreferencias('curador') : null;

  return (
    <TelaDeConta
      ambiente="curador"
      caminho={ROTA.CURADOR_CONTA}
      aba={aba}
      email={identidade.email}
      papeis={contexto.papeis}
      sessoes={sessoes}
      cadastroDoCurador={cadastroDoCurador}
      preferencias={preferencias}
    />
  );
}
