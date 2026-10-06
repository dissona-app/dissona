import type { Metadata } from 'next';

import { EscolhaDePerfil } from '@/componentes/autenticacao/EscolhaDePerfil';
import { MolduraDeAutenticacao } from '@/componentes/autenticacao/MolduraDeAutenticacao';
import { ROTA } from '@/lib/guarda-rota';
import { selecionarPerfil } from '@/modulos/autenticacao/acoes';

export const metadata: Metadata = {
  title: 'Escolha seu perfil · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 1.4 — seleção de perfil (RF-006).
 *
 * Destino de quem tem conta e nenhum papel: o cadastro não escolhe por ninguém.
 * Quem já tem papel não chega aqui — a guarda de rota o manda ao seu início.
 */
export default function Pagina() {
  return (
    <MolduraDeAutenticacao
      linksDeRodape={[
        { rotulo: 'Termos', href: ROTA.TERMOS },
        { rotulo: 'Privacidade', href: ROTA.PRIVACIDADE },
      ]}
    >
      <EscolhaDePerfil acao={selecionarPerfil} />
    </MolduraDeAutenticacao>
  );
}
