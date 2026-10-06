import type { Metadata } from 'next';

import { FormularioDeRedefinicao } from '@dissona/nucleo/componentes/autenticacao/FormularioDeRedefinicao';
import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { linksLegais, rota } from '@/lib/rotas';
import { redefinirSenha } from '@/acoes/autenticacao';
import { recuperacaoEmCurso } from '@dissona/nucleo/modulos/autenticacao/marcador-de-recuperacao';

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
    <MolduraDeAutenticacao ambiente="admin" linksDeRodape={linksLegais()}>
      <FormularioDeRedefinicao
        acao={redefinirSenha}
        hrefDoLogin={rota(ROTA.ADMIN_ENTRAR)}
        hrefDaRecuperacao={rota(ROTA.ADMIN_RECUPERAR_SENHA)}
        autorizado={autorizado}
      />
    </MolduraDeAutenticacao>
  );
}
