'use client';

/**
 * Provider do TanStack Query.
 *
 * A leitura de página é feita por Server Components (architecture.md §4); o
 * TanStack Query cobre o que é interativo no cliente — fila do curador com
 * filtro e ordenação, extrato com paginação, estados de pagamento no checkout.
 */

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

const UM_MINUTO = 60 * 1000;

function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dado de marketplace não muda a cada segundo; um minuto evita
        // refetch em cascata ao navegar entre telas do mesmo ambiente.
        staleTime: UM_MINUTO,
        gcTime: 5 * UM_MINUTO,
        // Foco de janela não é sinal de que o dado mudou, e um refetch aqui
        // custa uma volta ao banco por alt-tab.
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        // Mutação é sempre uma Server Action com efeito de negócio. Repetir
        // sozinho pode duplicar consumo de Clave ou avaliação.
        retry: 0,
      },
    },
  });
}

let clienteDoNavegador: QueryClient | undefined;

function obterQueryClient() {
  if (isServer) return criarQueryClient();
  clienteDoNavegador ??= criarQueryClient();
  return clienteDoNavegador;
}

export function ProvedorDeConsulta({ children }: { children: ReactNode }) {
  // `useState` e não `useMemo`: garante que o cliente sobreviva a um re-render
  // suspenso sem ser recriado, o que descartaria o cache no meio da navegação.
  const [queryClient] = useState(obterQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
