import type { Metadata } from 'next';

import { MolduraDoEnvio } from '@/componentes/artista/MolduraDoEnvio';
import { FormularioDaFaixa } from '@/componentes/artista/FormularioDaFaixa';
import { detectarFaixa, salvarFaixa } from '@/modulos/faixa/acoes';
import { lerLimitesDeUpload } from '@/modulos/faixa/consultas';

export const metadata: Metadata = {
  title: 'Enviar música',
  robots: { index: false, follow: false },
};

/**
 * 3 · Envio de música, passo 1.
 *
 * É a raiz do wizard porque ainda não existe faixa — ela nasce na submissão
 * deste passo, e do passo 2 em diante o id entra no caminho.
 */
export default async function PaginaDoEnvio() {
  const limites = await lerLimitesDeUpload();

  return (
    <MolduraDoEnvio passo="faixa">
      <FormularioDaFaixa
        faixa={null}
        limites={limites}
        acao={salvarFaixa}
        detectar={detectarFaixa}
      />
    </MolduraDoEnvio>
  );
}
