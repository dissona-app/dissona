import type { ReactNode } from 'react';

import { Shell } from '@dissona/nucleo/componentes/shell/Shell';
import { Papel } from '@dissona/nucleo/lib/papeis';
import { registrarAmbiente, sair } from '@/modulos/autenticacao/acoes';
import {
  lerContextoDaSessao,
  lerIdentidadeDaSessao,
} from '@dissona/nucleo/modulos/autenticacao/consultas';

/**
 * Shell do ambiente do curador — o **painel**.
 *
 * Fica em `(app)/(painel)` e não em `(app)/curador` porque o wizard do módulo
 * 12 mora em `(app)/(cadastro)/curador/cadastro` e **não** pode herdar este
 * shell: no protótipo ele é tela cheia, sem sidebar, e no primeiro acesso não
 * há o que navegar nela. É a mesma divisão que a R0 fez em `(admin)`, pelo
 * mesmo motivo — e lá o comentário do `layout.tsx` registra que a ausência
 * dela era um bug.
 *
 * Mesma composição do ambiente do artista — ver o comentário de lá sobre
 * `papeis` e sobre por que `registrarAmbiente` é condicional.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho, como o protótipo faz.
 */
export default async function LayoutPainelCurador({ children }: { children: ReactNode }) {
  const [contexto, identidade] = await Promise.all([
    lerContextoDaSessao(),
    lerIdentidadeDaSessao(),
  ]);

  const papeis = contexto.estado === 'ok' ? contexto.papeis : [];
  const precisaRegistrar = contexto.estado === 'ok' && contexto.ultimoAmbiente !== Papel.CURADOR;

  return (
    <Shell
      papelAtivo="curador"
      papeis={papeis}
      identidade={identidade ?? undefined}
      acaoDeSair={sair}
      registrarAmbiente={precisaRegistrar ? registrarAmbiente : undefined}
    >
      {children}
    </Shell>
  );
}
