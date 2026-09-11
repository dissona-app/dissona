import type { Metadata } from 'next';

import { FormularioDeRecuperacao } from '@/componentes/autenticacao/FormularioDeRecuperacao';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { recuperarSenha } from '@/modulos/autenticacao/acoes';
import { SEGUNDOS_DE_COOLDOWN_DE_ENVIO } from '@/modulos/autenticacao/servico';

export const metadata: Metadata = {
  title: 'Esqueci minha senha · Dissona',
  description: 'Receba um link para definir uma senha nova.',
};

/** Tela 1.2 — recuperação de senha de artista e curador. */
export default function Pagina() {
  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeRecuperacao
        acao={recuperarSenha}
        hrefDoLogin={ROTA.ENTRAR}
        segundosDeCooldown={SEGUNDOS_DE_COOLDOWN_DE_ENVIO}
      />
    </MolduraDeAutenticacao>
  );
}
