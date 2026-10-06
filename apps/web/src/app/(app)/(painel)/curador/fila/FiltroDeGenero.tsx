'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Selecao } from '@/componentes/base/Selecao';
import { FILA as TEXTOS } from '@/textos/prototipo';

export type PropsFiltroDeGenero = {
  readonly generos: readonly string[];
  readonly atual: string | null;
};

/**
 * Filtro de gênero da fila.
 *
 * Navega, e não guarda estado: o recorte vive na URL junto com o status e a
 * ordenação, pelas mesmas razões — endereço, recarregar e voltar funcionam.
 */
export function FiltroDeGenero({ generos, atual }: PropsFiltroDeGenero) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  return (
    <Selecao
      rotulo={TEXTOS.generoRotulo}
      variante="tabela"
      value={atual ?? ''}
      opcoes={[
        { valor: '', rotulo: TEXTOS.generoTodos },
        ...generos.map((genero) => ({ valor: genero, rotulo: genero })),
      ]}
      onChange={(evento) => {
        const proximo = new URLSearchParams(parametros.toString());
        if (evento.target.value === '') proximo.delete('genero');
        else proximo.set('genero', evento.target.value);
        router.push(`${caminho}?${proximo.toString()}`);
      }}
    />
  );
}
