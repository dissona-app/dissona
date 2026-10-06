import type { Metadata } from 'next';

import { AcoesDeVerificacao } from '@dissona/nucleo/componentes/autenticacao/AcoesDeVerificacao';
import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { reenviarVerificacao } from '@/modulos/autenticacao/acoes';

export const metadata: Metadata = {
  title: 'Confirme seu e-mail · Dissona',
  // Tela de passagem, com um endereço na URL. Não é para ser indexada.
  robots: { index: false, follow: false },
};

/**
 * Verificação de e-mail (RF-004).
 *
 * O endereço vem na query string porque **não há sessão** neste ponto: com a
 * confirmação exigida, o `signUp` cria a conta e não devolve sessão nenhuma.
 * Sem o endereço, o reenvio não teria para onde enviar.
 *
 * `?erro=token` é o retorno do route handler quando o link chegou expirado ou
 * já usado — 24 horas, uso único.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly email?: string; readonly erro?: string }>;
}) {
  const { email, erro } = await searchParams;

  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <AcoesDeVerificacao
        acaoDeReenvio={reenviarVerificacao}
        email={email}
        tokenInvalido={erro === 'token'}
      />
    </MolduraDeAutenticacao>
  );
}
