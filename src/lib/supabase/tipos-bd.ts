/**
 * ARQUIVO GERADO — não editar à mão (architecture.md §8).
 *
 * Regenere com `pnpm db:tipos` (stack local) ou `pnpm db:tipos:remoto`
 * (projeto linkado).
 *
 * O banco ainda não tem tabela nenhuma: as migrations `0001`–`0005` são da R1
 * e `0006`–`0010` da R2 (data-model §11). Este arquivo é o esqueleto vazio que
 * o gerador produz hoje, presente para que `tsconfig` e os clientes Supabase
 * já compilem tipados desde a R0.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
