'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Etiqueta } from '@/componentes/base/Etiqueta';
import { Tabela } from '@/componentes/base/Tabela';
import type { ColunaTabela } from '@/componentes/base/Tabela';
import { FILA as TEXTOS } from '@/textos/prototipo';

import estilos from './TabelaDaFila.module.css';

/** Uma linha da fila, **já formatada no servidor**. */
export type LinhaDaFila = {
  readonly envioId: string;
  readonly titulo: string;
  readonly artista: string;
  readonly genero: string;
  readonly servico: string;
  readonly prazo: string;
  readonly status: 'nova' | 'em_escuta' | 'atrasada';
  readonly urgente: boolean;
};

export type PropsTabelaDaFila = {
  readonly linhas: readonly LinhaDaFila[];
  readonly ordenadaPor: string;
  readonly direcao: 'asc' | 'desc';
  readonly vazio: React.ReactNode;
};

const TOM_DO_STATUS = {
  nova: 'info',
  em_escuta: 'sucesso',
  atrasada: 'erro',
} as const;

/**
 * A tabela da fila (13).
 *
 * Cliente só por causa da ordenação, que viaja na **URL** (`?ordem=&dir=`) e
 * não em estado local: assim o recorte tem endereço, sobrevive ao recarregar e
 * o `aria-sort` que RF-054 exige descreve algo real. A ordenação em si é do
 * serviço, no servidor — aqui só se navega.
 */
export function TabelaDaFila({ linhas, ordenadaPor, direcao, vazio }: PropsTabelaDaFila) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function ordenarPor(chave: string) {
    const atual = new URLSearchParams(parametros.toString());
    // Clicar na coluna já ordenada inverte; em outra, começa ascendente.
    const proximaDirecao = ordenadaPor === chave && direcao === 'asc' ? 'desc' : 'asc';
    atual.set('ordem', chave);
    atual.set('dir', proximaDirecao);
    router.push(`${caminho}?${atual.toString()}`);
  }

  const colunas: readonly ColunaTabela<LinhaDaFila>[] = [
    {
      chave: 'musica',
      titulo: TEXTOS.colunas.musica,
      ordenavel: true,
      celula: (linha) => (
        <a className={estilos.musica} href={`/curador/fila/${linha.envioId}`}>
          <span className={estilos.titulo}>{linha.titulo}</span>
          <span className={estilos.artista}>{linha.artista}</span>
        </a>
      ),
    },
    { chave: 'genero', titulo: TEXTOS.colunas.genero, celula: (linha) => linha.genero },
    { chave: 'servico', titulo: TEXTOS.colunas.servico, celula: (linha) => linha.servico },
    {
      chave: 'prazo',
      titulo: TEXTOS.colunas.prazo,
      ordenavel: true,
      celula: (linha) => (
        <span className={linha.urgente ? estilos.urgente : undefined}>{linha.prazo}</span>
      ),
    },
    {
      chave: 'status',
      titulo: TEXTOS.colunas.status,
      ordenavel: true,
      celula: (linha) => (
        <Etiqueta tom={TOM_DO_STATUS[linha.status]}>{TEXTOS.filtros[linha.status]}</Etiqueta>
      ),
    },
  ];

  return (
    <Tabela
      legenda={TEXTOS.titulo}
      colunas={colunas}
      linhas={linhas}
      chaveDaLinha={(linha) => linha.envioId}
      ordenadaPor={ordenadaPor}
      direcao={direcao}
      onOrdenar={ordenarPor}
      vazio={vazio}
    />
  );
}
