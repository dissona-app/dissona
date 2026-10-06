import type { ReactNode } from 'react';

import { CartaoDeSaldo } from '@/componentes/shell/CartaoDeSaldo';
import { Shell } from '@dissona/nucleo/componentes/shell/Shell';
import { Papel } from '@dissona/nucleo/lib/papeis';
import { registrarAmbiente, sair } from '@/modulos/autenticacao/acoes';
import {
  lerContextoDaSessao,
  lerIdentidadeDaSessao,
} from '@dissona/nucleo/modulos/autenticacao/consultas';
import { lerSaldoDisponivel } from '@/modulos/claves/consultas';

/**
 * Shell do ambiente do artista.
 *
 * `papeis` vem da sessão. Até a `0001` existir, a R0 passava `['artista']`
 * fixo, com a consequência declarada de esconder a troca de ambiente — não
 * havia como saber se a conta acumulava os dois papéis. Agora há, e o item
 * "Ver como curador" do menu da conta aparece para quem de fato tem os dois.
 *
 * O `registrarAmbiente` só é passado quando o valor gravado **difere** deste
 * ambiente (RF-008). Passá-lo sempre seria uma escrita no banco por navegação;
 * a informação muda quando a pessoa troca de ambiente, não quando abre outra
 * página do mesmo.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho, como o protótipo faz.
 */
export default async function LayoutArtista({ children }: { children: ReactNode }) {
  const [contexto, identidade] = await Promise.all([
    lerContextoDaSessao(),
    lerIdentidadeDaSessao(),
  ]);

  const papeis = contexto.estado === 'ok' ? contexto.papeis : [];
  const precisaRegistrar = contexto.estado === 'ok' && contexto.ultimoAmbiente !== Papel.ARTISTA;

  // O card de saldo do protótipo. `null` para conta sem perfil de artista — é
  // o mesmo instante em que a guarda de rota já está mandando a pessoa embora,
  // e aí a sidebar simplesmente não tem rodapé.
  const disponivel = await lerSaldoDisponivel();

  return (
    <Shell
      papelAtivo="artista"
      papeis={papeis}
      identidade={identidade ?? undefined}
      acaoDeSair={sair}
      registrarAmbiente={precisaRegistrar ? registrarAmbiente : undefined}
      rodapeNavegacao={disponivel === null ? undefined : <CartaoDeSaldo disponivel={disponivel} />}
    >
      {children}
    </Shell>
  );
}
