import type { Metadata } from 'next';

import { FormularioDeRedefinicao } from '@/componentes/autenticacao/FormularioDeRedefinicao';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { redefinirSenha } from '@/modulos/autenticacao/acoes';
import { recuperacaoEmCurso } from '@/modulos/autenticacao/marcador-de-recuperacao';

export const metadata: Metadata = {
  title: 'Definir nova senha · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 19.2 — definir nova senha, administrativa.
 *
 * A ação é a **mesma** da 1.3: redefinir senha não depende de papel, e a
 * `updateUser` age sobre a sessão que o link criou. O que muda é para onde os
 * dois botões voltam — login e recuperação administrativos.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly erro?: string }>;
}) {
  const { erro } = await searchParams;
  const autorizado = erro !== 'token' && (await recuperacaoEmCurso());

  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Segurança', href: ROTA.PRIVACIDADE },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeRedefinicao
        acao={redefinirSenha}
        hrefDoLogin={ROTA.ADMIN_ENTRAR}
        hrefDaRecuperacao={ROTA.ADMIN_RECUPERAR_SENHA}
        autorizado={autorizado}
      />
    </MolduraDeAutenticacao>
  );
}
