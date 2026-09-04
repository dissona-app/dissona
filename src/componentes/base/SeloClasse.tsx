import estilos from './SeloClasse.module.css';

/** Enum `classe_curador` do banco (data-model 1). */
export type ClasseCurador = 'bronze' | 'prata' | 'ouro';

export type PropsSeloClasse = {
  readonly classe: ClasseCurador;
  /** Esconde o marcador, para uso em linha de tabela densa. */
  readonly semMarcador?: boolean;
};

const CLASSE_TOM: Record<ClasseCurador, string | undefined> = {
  bronze: estilos.bronze,
  prata: estilos.prata,
  ouro: estilos.ouro,
};

const ROTULO: Record<ClasseCurador, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

export function SeloClasse({ classe, semMarcador = false }: PropsSeloClasse) {
  return (
    <span className={[estilos.base, CLASSE_TOM[classe]].filter(Boolean).join(' ')}>
      {semMarcador ? null : <span className={estilos.marcador} aria-hidden="true" />}
      {ROTULO[classe]}
    </span>
  );
}
