import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { TelaDeConta, ehAbaDeConta } from '@/componentes/conta/TelaDeConta';
import { ROTA } from '@/lib/guarda-rota';
import { lerContextoDaSessao, lerIdentidadeDaSessao } from '@/modulos/autenticacao/consultas';
import { lerSessoesDaConta } from '@/modulos/conta/consultas';

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
  const aba = ehAbaDeConta(bruta) ? bruta : 'dados';

  const [contexto, identidade] = await Promise.all([
    lerContextoDaSessao(),
    lerIdentidadeDaSessao(),
  ]);

  if (contexto.estado !== 'ok' || identidade === null) redirect(ROTA.ENTRAR);

  const sessoes = aba === 'seguranca' ? await lerSessoesDaConta() : [];

  return (
    <TelaDeConta
      ambiente="curador"
      caminho={ROTA.CURADOR_CONTA}
      aba={aba}
      email={identidade.email}
      papeis={contexto.papeis}
      sessoes={sessoes}
    />
  );
}
