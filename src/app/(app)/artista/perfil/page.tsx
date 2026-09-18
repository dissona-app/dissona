import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { VitrineDoPerfil } from '@/componentes/artista/VitrineDoPerfil';
import { ROTA } from '@/lib/guarda-rota';
import { urlPublicaDoAvatar } from '@/lib/supabase/armazenamento';
import { lerVitrineDoArtista } from '@/modulos/artista/consultas';
import { ARTISTA_VITRINE } from '@/textos/prototipo';

export const metadata: Metadata = {
  title: ARTISTA_VITRINE.titulo,
  robots: { index: false, follow: false },
};

/**
 * 7.1 · Perfil — a vitrine.
 *
 * É para cá que a sidebar aponta "Perfil", e é a primeira das duas telas do
 * módulo no protótipo; o formulário mora em `/artista/perfil/editar`.
 *
 * Sem `<h1>`: o `Shell` deriva título e sublegenda do caminho.
 */
export default async function PaginaDoPerfilDoArtista() {
  const vitrine = await lerVitrineDoArtista();

  // A guarda de rota já exige o papel `artista`; isto cobre a janela entre
  // trocar de papel e a navegação chegar aqui.
  if (vitrine === null) redirect(ROTA.ARTISTA);

  const fotoUrl = await urlPublicaDoAvatar(vitrine.perfil.fotoCaminho, vitrine.perfil.atualizadoEm);

  return <VitrineDoPerfil vitrine={vitrine} fotoUrl={fotoUrl} />;
}
