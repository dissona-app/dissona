import type { Metadata } from 'next';

import { FormularioDeRecuperacao } from '@/componentes/autenticacao/FormularioDeRecuperacao';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { urlDoAdmin } from '@/lib/rotas-admin-servidor';
import { recuperarSenhaAdmin } from '@/modulos/autenticacao/acoes';
import { SEGUNDOS_DE_COOLDOWN_DE_ENVIO } from '@/modulos/autenticacao/servico';

export const metadata: Metadata = {
  title: 'Esqueci minha senha · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 19.1 — recuperação de senha administrativa.
 *
 * Mesma copy e mesmo componente da 1.2: o protótipo do Admin repete a tela do
 * Artista palavra por palavra. O que muda é a ação — que manda o link de volta
 * para `/admin/redefinir-senha` — e o rodapé, que aqui aponta para Segurança.
 */
export default async function Pagina() {
  return (
    <MolduraDeAutenticacao
      ambiente="admin"
      linksDeRodape={[
        { rotulo: 'Segurança', href: ROTA.PRIVACIDADE },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeRecuperacao
        acao={recuperarSenhaAdmin}
        hrefDoLogin={await urlDoAdmin(ROTA.ADMIN_ENTRAR)}
        segundosDeCooldown={SEGUNDOS_DE_COOLDOWN_DE_ENVIO}
      />
    </MolduraDeAutenticacao>
  );
}
