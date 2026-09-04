'use client';

import Link from 'next/link';

import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';

import estilos from './TrocaDePapel.module.css';

export type PropsTrocaDePapel = {
  readonly papelAtivo: Papel;
  readonly papeis: readonly Papel[];
};

const DESTINO: Partial<Record<Papel, string>> = {
  artista: ROTA.ARTISTA,
  curador: ROTA.CURADOR,
};

const ROTULO: Record<Papel, string> = {
  artista: 'Artista',
  curador: 'Curador',
  admin: 'Admin',
};

/**
 * Troca de ambiente artista ↔ curador.
 *
 * Papéis são acumuláveis na mesma conta (architecture.md §1), e o controle só
 * aparece para quem tem os dois — mostrar uma escolha de um item só é ruído.
 * O admin fica de fora: é papel à parte, com login próprio, e não entra na
 * troca.
 *
 * São **links**, e não botões de estado: a troca navega para outro ambiente, e
 * quem usa teclado ou leitor de tela deve receber isso como navegação.
 */
export function TrocaDePapel({ papelAtivo, papeis }: PropsTrocaDePapel) {
  const alternaveis = papeis.filter((papel) => papel !== 'admin');
  if (alternaveis.length < 2) return null;

  return (
    <nav className={estilos.trilha} aria-label="Trocar de ambiente">
      {alternaveis.map((papel) => {
        const destino = DESTINO[papel];
        if (destino === undefined) return null;
        const ativo = papel === papelAtivo;

        return (
          <Link
            key={papel}
            href={destino}
            className={[estilos.opcao, ativo ? estilos.ativa : undefined].filter(Boolean).join(' ')}
            aria-current={ativo ? 'page' : undefined}
          >
            {ROTULO[papel]}
          </Link>
        );
      })}
    </nav>
  );
}
