import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ConfirmacaoDeCadastro } from '@/componentes/autenticacao/ConfirmacaoDeCadastro';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { confirmarCadastro, sair } from '@/modulos/autenticacao/acoes';

export const metadata: Metadata = {
  title: 'Confirme seus dados · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Confirmação do cadastro social (RF-002 + RF-010).
 *
 * Existe porque um provider nativo não permite "confirmar antes de criar": a
 * conta nasce no callback do OAuth, e o aceite de Termos — que é obrigação de
 * LGPD — só pode ser colhido depois. Até ele vir, a guarda de rota devolve
 * qualquer navegação para cá.
 *
 * O nome vem do `user_metadata` que o provedor preencheu (`full_name` no
 * Google, `name` no Facebook), e é editável: o nome do provedor costuma ser o
 * nome civil, e o produto pede "como você assina seu trabalho".
 */
export default async function Pagina() {
  const usuario = await usuarioAtual();

  // A guarda de rota já exige sessão; este `redirect` cobre a corrida entre a
  // decisão dela e a renderização — e é preferível a renderizar uma tela de
  // confirmação sem ninguém para confirmar.
  if (usuario === null) redirect(ROTA.ENTRAR);

  const metadados = usuario.user_metadata as {
    readonly nome_completo?: unknown;
    readonly full_name?: unknown;
    readonly name?: unknown;
  } | null;

  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <ConfirmacaoDeCadastro
        acao={confirmarCadastro}
        acaoDeSair={sair}
        nome={primeiroTexto(metadados?.nome_completo, metadados?.full_name, metadados?.name)}
        email={usuario.email ?? ''}
      />
    </MolduraDeAutenticacao>
  );
}

/**
 * O primeiro dos candidatos que seja texto útil.
 *
 * Três chaves porque três origens: `nome_completo` é a nossa (cadastro por
 * e-mail), `full_name` é a do Google e `name` a do Facebook. Nenhuma é garantida
 * — um provedor pode devolver o perfil sem nome —, e o campo é editável, então
 * vazio é um estado aceitável.
 */
function primeiroTexto(...candidatos: readonly unknown[]): string {
  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.trim() !== '') return candidato.trim();
  }
  return '';
}
