import type { Metadata } from 'next';

import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { AceiteDeConvite } from '@/componentes/equipe/AceiteDeConvite';
import type { EstadoDoAceite } from '@/componentes/equipe/AceiteDeConvite';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { concluirAceiteDoConvite } from '@/modulos/equipe/acoes';

export const metadata: Metadata = {
  title: 'Convite da equipe · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Aceite de convite da equipe (27.3).
 *
 * Vive em `(admin)/(acesso)`, e não no painel: quem chega **ainda não é**
 * administrador — o vínculo nasce aqui. Herdar o shell administrativo seria
 * mostrar uma sidebar de módulos a quem não tem nenhum deles.
 *
 * A guarda de rota trata `ADMIN_CONVITE` como rota sem sessão obrigatória, e é
 * por isso: o link pode ser aberto num navegador onde a sessão do convite já
 * expirou, e a tela precisa poder dizer "entre e volte" em vez de mandar a
 * pessoa ao login sem explicação.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly token?: string }>;
}) {
  const { token } = await searchParams;
  const usuario = await usuarioAtual();

  const estadoInicial: EstadoDoAceite =
    token === undefined || token.trim() === ''
      ? 'sem_token'
      : usuario === null
        ? 'sem_sessao'
        : 'pronto';

  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <AceiteDeConvite
        estadoInicial={estadoInicial}
        acao={concluirAceiteDoConvite}
        token={token ?? ''}
      />
    </MolduraDeAutenticacao>
  );
}
