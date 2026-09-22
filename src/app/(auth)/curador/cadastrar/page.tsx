import type { Metadata } from 'next';

import { FormularioDeCadastro } from '@/componentes/autenticacao/FormularioDeCadastro';
import { MolduraDoWizard } from '@/componentes/curador/MolduraDoWizard';
import { PainelDeMarca } from '@/componentes/curador/PainelDeMarca';
import { ROTA } from '@/lib/guarda-rota';
import { cadastrar } from '@/modulos/autenticacao/acoes';
import { TOTAL_DE_PASSOS } from '@/modulos/curador/tipos';
import { CADASTRAR_CURADOR } from '@/textos/prototipo';

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
 * ver `CADASTRAR_CURADOR` em `textos/prototipo.ts`). É por isso que esta
 * página usa a moldura do wizard (`MolduraDoWizard` + `PainelDeMarca`), e não
 * a `MolduraDeAutenticacao` com o aside "Como funciona" do artista — as duas
 * telas de criar conta têm identidades visuais diferentes porque os dois
 * protótipos são diferentes aqui, não só na copy.
 *
 * Sem login social: o protótipo não mostra os três botões neste passo (eles
 * ficam só na tela de login) — ver o rodapé de `Curador.html` nesta seção.
 *
 * O papel vai como hidden input para a mesma Server Action `cadastrar`, que
 * grava "curador" assim que a sessão existir — direto ao wizard do módulo 12,
 * sem passar por `/selecao-de-perfil`.
 */
export default function Pagina() {
  return (
    <MolduraDoWizard passo={1} total={TOTAL_DE_PASSOS} aside={<PainelDeMarca />}>
      <FormularioDeCadastro
        acao={cadastrar}
        textos={CADASTRAR_CURADOR}
        hrefEntrar={ROTA.CURADOR_ENTRAR}
        papel="curador"
        semCabecalho
        tamanhoDoBotao="denso"
        blocoInteiro={false}
        corDoRodape="neutro"
      />
    </MolduraDoWizard>
  );
}
