import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PerfilDoCuradorPublico } from '@/componentes/curador/PerfilDoCuradorPublico';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { urlPublicaDoAvatar } from '@dissona/nucleo/lib/supabase/armazenamento';
import { lerValorDaClave } from '@dissona/nucleo/modulos/pacote/consultas';
import { lerCadastroDoCurador, lerVitrineDoCuradorCompleta } from '@/modulos/curador/consultas';

export const metadata: Metadata = {
  title: 'Meu perfil · Dissona',
  robots: { index: false, follow: false },
};

/**
 * "Meu perfil" do curador — protótipo aprovado: a vitrine que o artista vê.
 * A manutenção (mídias, serviços, classe) fica em `/curador/meu-cadastro/editar`.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();

  if (estado === null) redirect(ROTA.CURADOR_ENTRAR);
  if (!estado.concluido) redirect(ROTA.CURADOR_CADASTRO);

  const [fotoUrl, vitrine, valorDaClave] = await Promise.all([
    urlPublicaDoAvatar(estado.fotoCaminho),
    lerVitrineDoCuradorCompleta(estado.perfilCuradorId),
    lerValorDaClave(),
  ]);
  if (vitrine === null) redirect(ROTA.CURADOR_ENTRAR);

  return (
    <PerfilDoCuradorPublico
      nome={estado.nome}
      fotoUrl={fotoUrl}
      classe={estado.classe}
      generos={estado.generos}
      bio={estado.bio}
      canais={estado.canais}
      servicos={estado.servicos}
      valorDaClave={valorDaClave}
      vitrine={vitrine}
    />
  );
}
