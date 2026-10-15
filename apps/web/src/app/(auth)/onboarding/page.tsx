import type { Metadata } from 'next';

import { OrbitaDeFundo } from '@dissona/nucleo/componentes/autenticacao/OrbitaDeFundo';
import { Marca } from '@dissona/nucleo/componentes/base/Marca';
import { NavegadorDoTour } from '@dissona/nucleo/componentes/autenticacao/NavegadorDoTour';
import { ProvedorDoTour } from '@dissona/nucleo/componentes/autenticacao/estado-do-tour';
import { TourDeOnboarding } from '@dissona/nucleo/componentes/autenticacao/TourDeOnboarding';
import type { PassoDoTour } from '@dissona/nucleo/componentes/autenticacao/TourDeOnboarding';
import { Papel } from '@dissona/nucleo/lib/papeis';
import { encerrarOnboarding } from '@/modulos/autenticacao/acoes';
import { lerContextoDaSessao } from '@dissona/nucleo/modulos/autenticacao/consultas';
import { ONBOARDING } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Como a Dissona funciona · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 1.5 — onboarding por ambiente (RF-007).
 *
 * Fica em `(auth)`, fora do shell, porque o protótipo o desenha como uma tela
 * cheia e não como conteúdo de painel — e porque no primeiro acesso ainda não
 * há o que navegar na sidebar.
 *
 * O conteúdo é escolhido pelo papel da conta, com a mesma prioridade do
 * roteamento. Quem tem os dois papéis vê o tour do artista: é o ambiente em que
 * ele vai cair, e mostrar o do curador seria explicar uma tela que ele não abriu.
 *
 * `?rever=1` vem do menu de ajuda. A diferença é só o botão "Pular", que sai —
 * quem reabriu já conhece o tour.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly rever?: string }>;
}) {
  const { rever } = await searchParams;
  const contexto = await lerContextoDaSessao();

  const papeis = contexto.estado === 'ok' ? contexto.papeis : [];
  const passos = passosDoPapel(papeis);

  return (
    // O provedor envolve a moldura porque as **duas** colunas mexem no mesmo
    // passo: o card à esquerda por "Avançar"/"Voltar", o painel à direita
    // saltando direto. A moldura segue sendo componente de servidor.
    <ProvedorDoTour total={passos.length}>
      {/* Protótipo aprovado: a marca no alto da coluna do cartão, "Pular" à
          direita dela, o cartão de 540px e a lista de 460px ao lado — sem
          rodapé. */}
      <div className={estilos.pagina}>
        <OrbitaDeFundo centro="50%" />
        <div className={estilos.grade}>
          <div className={estilos.coluna}>
            <header className={estilos.topo}>
              <Marca variante="branca" altura="32px" />
            </header>
            <main className={estilos.cartao}>
              <TourDeOnboarding
                passos={passos}
                acaoDeEncerrar={encerrarOnboarding}
                revendo={rever === '1'}
              />
            </main>
          </div>
          <aside className={estilos.lateral}>
            <NavegadorDoTour />
          </aside>
        </div>
      </div>
    </ProvedorDoTour>
  );
}

function passosDoPapel(papeis: readonly Papel[]): readonly PassoDoTour[] {
  if (papeis.includes(Papel.ARTISTA)) return ONBOARDING.artista;
  if (papeis.includes(Papel.CURADOR)) return ONBOARDING.curador;
  if (papeis.includes(Papel.ADMIN)) return ONBOARDING.admin;
  // A guarda de rota não deixa chegar aqui sem papel; se chegar, o tour do
  // artista é o mais provável e não promete nada que dependa de papel.
  return ONBOARDING.artista;
}
