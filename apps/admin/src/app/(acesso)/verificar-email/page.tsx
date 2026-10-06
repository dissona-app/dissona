import type { Metadata } from 'next';

import { AcoesDeVerificacao } from '@dissona/nucleo/componentes/autenticacao/AcoesDeVerificacao';
import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';

import { reenviarVerificacao } from '@/acoes/autenticacao';
import { linksDeTermos, ROTA_PAINEL } from '@/lib/rotas';

export const metadata: Metadata = {
  title: 'Confirme seu e-mail · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Confirmação de e-mail pendente — o atalho "E-mail não confirmado" do menu da
 * conta leva aqui. É a mesma tela do site; a sessão do painel só existe neste
 * host, então ela precisa responder aqui também.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly email?: string; readonly erro?: string }>;
}) {
  const { email, erro } = await searchParams;

  return (
    <MolduraDeAutenticacao ambiente="admin" linksDeRodape={linksDeTermos()}>
      <AcoesDeVerificacao
        acaoDeReenvio={reenviarVerificacao}
        email={email}
        tokenInvalido={erro === 'token'}
        hrefDoLogin={ROTA_PAINEL.ENTRAR}
        hrefDeCorrecao={null}
      />
    </MolduraDeAutenticacao>
  );
}
