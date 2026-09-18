import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ROTA } from '@/lib/guarda-rota';
import { urlPublicaDoAvatar } from '@/lib/supabase/armazenamento';
import { salvarPerfilDoArtista } from '@/modulos/artista/acoes';
import { lerPerfilDoArtista } from '@/modulos/artista/consultas';
import { ARTISTA_PERFIL } from '@/textos/prototipo';

import { FormularioDePerfil } from './FormularioDePerfil';

export const metadata: Metadata = {
  title: ARTISTA_PERFIL.titulo,
  robots: { index: false, follow: false },
};

/**
 * 7.1 · Editar cadastro — o formulário do perfil.
 *
 * Fica numa subrota porque o protótipo tem **duas** telas: "Perfil"
 * (`/artista/perfil`, a vitrine em leitura, para onde a sidebar aponta) e
 * "Editar cadastro", alcançada pelo botão de lá. Era só esta, ocupando o
 * endereço da outra.
 *
 * Sem `<h1>`: o `Shell` deriva título e sublegenda do caminho
 * (`componentes/shell/titulo-por-caminho.ts`).
 */
export default async function PaginaDeEdicaoDoPerfil() {
  const perfil = await lerPerfilDoArtista();

  // A guarda de rota já exige o papel `artista`; isto cobre a janela entre
  // trocar de papel e a navegação chegar aqui.
  if (perfil === null) redirect(ROTA.ARTISTA);

  const fotoUrl = await urlPublicaDoAvatar(perfil.fotoCaminho, perfil.atualizadoEm);

  return <FormularioDePerfil perfil={perfil} fotoUrl={fotoUrl} acao={salvarPerfilDoArtista} />;
}
