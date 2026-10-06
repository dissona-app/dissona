import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { MolduraDoWizard } from '@/componentes/curador/MolduraDoWizard';
import { PainelDeMarca } from '@/componentes/curador/PainelDeMarca';
import { Passo1Dados } from '@/componentes/curador/passos/Passo1Dados';
import { Passo2Generos } from '@/componentes/curador/passos/Passo2Generos';
import { Passo3Atuacao } from '@/componentes/curador/passos/Passo3Atuacao';
import { Passo4Canais } from '@/componentes/curador/passos/Passo4Canais';
import { Passo5Servicos } from '@/componentes/curador/passos/Passo5Servicos';
import { Passo6Credenciais } from '@/componentes/curador/passos/Passo6Credenciais';
import { Passo7Bio } from '@/componentes/curador/passos/Passo7Bio';
import { Passo8Revisao } from '@/componentes/curador/passos/Passo8Revisao';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import {
  enviarCadastro,
  pularPasso,
  salvarPasso1,
  salvarPasso2,
  salvarPasso3,
  salvarPasso4,
  salvarPasso5,
  salvarPasso6,
  salvarPasso7,
  voltarPasso,
} from '@/modulos/curador/acoes';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import type { PassoDoCadastro } from '@dissona/nucleo/modulos/curador/tipos';
import { ehPasso, TOTAL_DE_PASSOS } from '@dissona/nucleo/modulos/curador/tipos';

export const metadata: Metadata = {
  title: 'Cadastro de curador · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Wizard do módulo 12 — uma rota, oito faces.
 *
 * Uma rota por passo (`/curador/cadastro/3`) e não estado local, ao contrário
 * do onboarding: aqui o progresso é **persistido** em `passo_cadastro`, o
 * wizard é retomável dias depois, e o "Editar" da revisão salta para um passo
 * específico. Com estado local, nada disso teria endereço.
 *
 * O passo fora de 1..8 é 404, e não um redirecionamento silencioso: um número
 * inventado na URL é erro de quem digitou, e mandá-lo para o passo 1 esconderia
 * isso.
 */
export default async function Pagina({
  params,
}: {
  readonly params: Promise<{ readonly passo: string }>;
}) {
  const { passo: bruto } = await params;
  if (!ehPasso(bruto)) notFound();

  const passo = Number(bruto) as PassoDoCadastro;
  const estado = await lerCadastroDoCurador();

  // Sem `perfil_curador` não há wizard. A guarda de rota já exige o papel
  // `curador`, e `lerCadastroDoCurador` cria a linha se ela faltar — então
  // chegar aqui com `null` significa sessão perdida no meio do caminho.
  if (estado === null) redirect(ROTA.CURADOR_ENTRAR);

  // Cadastro concluído não volta ao wizard: a classificação é o que responde
  // "e agora?". A alteração de cadastro é outra tela (12.6).
  if (estado.concluido) redirect(ROTA.CURADOR_CADASTRO_CLASSIFICACAO);

  const comuns = {
    passo,
    acaoDeVoltar: voltarPasso,
    acaoDePular: pularPasso,
    estado,
  };

  return (
    <MolduraDoWizard
      passo={passo}
      total={TOTAL_DE_PASSOS}
      aside={passo === 1 ? <PainelDeMarca /> : undefined}
    >
      {passo === 1 ? <Passo1Dados {...comuns} acao={salvarPasso1} /> : null}
      {passo === 2 ? <Passo2Generos {...comuns} acao={salvarPasso2} /> : null}
      {passo === 3 ? <Passo3Atuacao {...comuns} acao={salvarPasso3} /> : null}
      {passo === 4 ? <Passo4Canais {...comuns} acao={salvarPasso4} /> : null}
      {passo === 5 ? <Passo5Servicos {...comuns} acao={salvarPasso5} /> : null}
      {passo === 6 ? <Passo6Credenciais {...comuns} acao={salvarPasso6} /> : null}
      {passo === 7 ? <Passo7Bio {...comuns} acao={salvarPasso7} /> : null}
      {passo === 8 ? <Passo8Revisao {...comuns} acao={enviarCadastro} /> : null}
    </MolduraDoWizard>
  );
}
