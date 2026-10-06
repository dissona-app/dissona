import type { Metadata } from 'next';

import { FormularioDeContaDoCurador } from '@/componentes/curador/FormularioDeContaDoCurador';
import { MolduraDoWizard } from '@/componentes/curador/MolduraDoWizard';
import { PainelDeMarca } from '@/componentes/curador/PainelDeMarca';
import { cadastrarCurador } from '@/modulos/autenticacao/acoes';
import { TOTAL_DE_PASSOS } from '@dissona/nucleo/modulos/curador/tipos';

export const metadata: Metadata = {
  title: 'Criar conta · Dissona',
  description: 'Crie sua conta de curador e comece a avaliar músicas.',
};

/**
 * Tela 1.1 — criar conta, exclusiva do curador.
 *
 * O protótipo (`docs/R2/extraido/Curador.html`) não tem uma tela de cadastro
 * própria: "Criar conta" no login leva direto ao **passo 1 do wizard** do
 * módulo 12, na variante para quem ainda não tem sessão (`cHerdado: false` —
 * ver `CURADOR_CADASTRO` em `textos/curador.ts` e `esquemaCadastroCurador`
 * em `modulos/autenticacao/esquemas.ts`). É por isso que esta página usa a
 * moldura do wizard (`MolduraDoWizard` + `PainelDeMarca`), e não a
 * `MolduraDeAutenticacao` com o aside "Como funciona" do artista — as duas
 * telas de criar conta têm identidades visuais diferentes porque os dois
 * protótipos são diferentes aqui, não só na copy.
 */
export default function Pagina() {
  return (
    <MolduraDoWizard passo={1} total={TOTAL_DE_PASSOS} aside={<PainelDeMarca />}>
      <FormularioDeContaDoCurador acao={cadastrarCurador} />
    </MolduraDoWizard>
  );
}
