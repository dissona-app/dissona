import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ROTA } from '@/lib/guarda-rota';
import { salvarPerfilDoArtista } from '@/modulos/artista/acoes';
import { lerPerfilDoArtista } from '@/modulos/artista/consultas';

import { FormularioDePerfil } from './FormularioDePerfil';

export const metadata: Metadata = {
  title: 'Perfil',
  robots: { index: false, follow: false },
};

/**
 * 7.1 · Perfil do artista.
 *
 * Sem `<h1>`: o `Shell` deriva título e sublegenda do caminho
 * (`componentes/shell/titulo-por-caminho.ts`).
 */
export default async function PaginaDePerfilDoArtista() {
  const perfil = await lerPerfilDoArtista();

  // A guarda de rota já exige o papel `artista`; isto cobre a janela entre
  // trocar de papel e a navegação chegar aqui. Mandar para o início é melhor
  // que um 404 numa tela que a pessoa acabou de clicar no menu.
  if (perfil === null) redirect(ROTA.ARTISTA);

  return <FormularioDePerfil perfil={perfil} acao={salvarPerfilDoArtista} />;
}
