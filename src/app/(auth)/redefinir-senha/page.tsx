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
 * Tela 1.3 — definir nova senha.
 *
 * A autorização é o **marcador de recuperação**, e não a sessão. A sessão
 * existe aqui — o link do e-mail a cria —, mas ela também existe num login
 * normal, e aceitar qualquer sessão faria desta tela um desvio da
 * reautenticação que a troca de senha em Conta exige. Ver
 * `marcador-de-recuperacao.ts`.
 *
 * `?erro=token` chega do route handler quando o próprio token foi recusado, e
 * leva ao mesmo estado: 60 minutos, uso único.
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
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <FormularioDeRedefinicao
        acao={redefinirSenha}
        hrefDoLogin={ROTA.ENTRAR}
        hrefDaRecuperacao={ROTA.RECUPERAR_SENHA}
        autorizado={autorizado}
      />
    </MolduraDeAutenticacao>
  );
}
