import type { ReactNode } from 'react';

import { RodapeDoAdmin } from '@dissona/nucleo/componentes/shell/RodapeDoAdmin';
import { Shell } from '@dissona/nucleo/componentes/shell/Shell';
import { sairDoAdmin } from '@/acoes/autenticacao';
import {
  lerIdentidadeDaSessao,
  lerPapeisDaSessao,
} from '@dissona/nucleo/modulos/autenticacao/consultas';

/**
 * Shell do painel administrativo.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho (`titulo-por-caminho.ts`),
 * como o protótipo faz. Passar um título fixo aqui sobrescreveria o da rota, e
 * toda tela do painel mostraria "Administração" no `<h1>` — inclusive a de
 * pacotes, cujo título é "Pacotes de Claves".
 *
 * `papeis` vem da sessão, e não mais fixo em `['admin']`. Hoje o efeito é
 * outro: a troca de ambiente vive no menu da conta e **não** aparece no
 * ambiente administrativo (o admin é papel à parte, RF-008), mas `papeis`
 * continua sendo o dado que essa decisão lê.
 *
 * `sairDoAdmin`, e não `sair`: quem sai do painel volta para o login
 * administrativo, não para a home pública. E **sem** `registrarAmbiente`: o
 * admin tem porta própria e não entra no "último ambiente usado" (RF-008) —
 * gravá-lo mandaria um admin-e-artista para o painel administrativo no login
 * pelo ambiente do artista.
 */
export default async function LayoutPainelAdmin({ children }: { children: ReactNode }) {
  const [papeis, identidade] = await Promise.all([lerPapeisDaSessao(), lerIdentidadeDaSessao()]);

  return (
    <Shell
      papelAtivo="admin"
      papeis={papeis}
      limite="total"
      // A faixa "Ambiente administrativo" do pé da sidebar — o equivalente ao
      // cartão de saldo do artista no mesmo slot.
      rodapeNavegacao={<RodapeDoAdmin />}
      identidade={identidade ?? undefined}
      acaoDeSair={sairDoAdmin}
    >
      {children}
    </Shell>
  );
}
