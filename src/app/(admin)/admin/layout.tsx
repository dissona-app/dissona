import type { ReactNode } from 'react';

import { Shell } from '@/componentes/shell/Shell';

/*
 * O painel admin usa o shell; a tela de login (`/admin/entrar`) fica fora
 * dele.
 *
 * ⚠️ PENDENTE R1: `/admin/entrar` e as telas de recuperação de senha caem
 * aqui dentro e herdam o shell, o que está errado — quem não tem sessão veria
 * a navegação do painel. A correção é mover o login para um route group
 * próprio quando a TASK-140 for implementada.
 */
export default function LayoutPainelAdmin({ children }: { children: ReactNode }) {
  return (
    <Shell papelAtivo="admin" papeis={['admin']} titulo="Administração" limite="contaAdmin">
      {children}
    </Shell>
  );
}
