import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Abas } from '@/componentes/base/Abas';
import { EstadoVazio } from '@/componentes/base/EstadoVazio';
import { ConviteDeMembro } from '@/componentes/equipe/ConviteDeMembro';
import { DadosDoMembro } from '@/componentes/equipe/DadosDoMembro';
import { ListaDaEquipe } from '@/componentes/equipe/ListaDaEquipe';
import { MatrizDePermissoes } from '@/componentes/equipe/MatrizDePermissoes';
import { ROTA } from '@/lib/guarda-rota';
import { urlPublicaDoAvatar } from '@/lib/supabase/armazenamento';
import { lerIdentidadeDaSessao } from '@/modulos/autenticacao/consultas';
import { lerPermissao, ModuloAdmin } from '@/modulos/admin/permissoes';
import { trocarEmail, trocarSenha } from '@/modulos/conta/acoes';
import {
  alterarAcesso,
  alterarPapel,
  convidarMembroDaEquipe,
  reenviarConviteDaEquipe,
  salvarDadosPessoais,
  salvarMatriz,
} from '@/modulos/equipe/acoes';
import {
  lerEquipeDaConta,
  lerMatrizDePermissoes,
  lerMeusDadosDeMembro,
} from '@/modulos/equipe/servico';
import { EQUIPE } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Conta e equipe · Dissona',
  robots: { index: false, follow: false },
};

const ABAS = [
  { chave: 'dados', rotulo: EQUIPE.abas.dados },
  { chave: 'equipe', rotulo: EQUIPE.abas.equipe },
  { chave: 'papeis', rotulo: EQUIPE.abas.papeis },
] as const;

type AbaDaEquipe = (typeof ABAS)[number]['chave'];

function ehAba(valor: string | undefined): valor is AbaDaEquipe {
  return ABAS.some((aba) => aba.chave === valor);
}

/**
 * Conta e equipe — telas 27.1, 27.2, 27.3 e 27.4.
 *
 * ## A permissão decide o que existe, não o que fica cinza
 *
 * "Dados pessoais" é de qualquer integrante — são os dados dele. "Equipe" e
 * "Papéis e permissões" exigem `tem_permissao('equipe')`, e quem não a tem
 * **não vê as abas**: mostrá-las e negar o conteúdo diria à pessoa que existe
 * algo ali para ela, e a nota da matriz já explica que a gestão é do
 * Administrador.
 *
 * Isso não substitui a RLS nem a checagem nas RPCs — é a terceira camada
 * (architecture §5.2), e a única das três que consegue *não desenhar* o botão.
 *
 * ## As leituras são por aba
 *
 * A lista de equipe é uma RPC que junta duas tabelas com `auth.users`; a matriz
 * é outra consulta. Buscar as duas para quem abriu "Dados pessoais" seria pagar
 * por telas que talvez nem sejam visitadas — e é a razão de a aba viver na URL.
 *
 * Sem `<h1>`: o `Shell` já põe o da rota.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly aba?: string }>;
}) {
  const { aba: bruta } = await searchParams;

  const [identidade, permissao, meusDados] = await Promise.all([
    lerIdentidadeDaSessao(),
    lerPermissao(ModuloAdmin.EQUIPE),
    lerMeusDadosDeMembro(),
  ]);

  // A guarda de rota já exige o papel `admin`; chegar aqui sem sessão é sessão
  // perdida entre o middleware e o render.
  if (identidade === null) redirect(ROTA.ADMIN_ENTRAR);

  const abasVisiveis = permissao.podeLer ? ABAS : ABAS.filter((aba) => aba.chave === 'dados');
  const aba = ehAba(bruta) && abasVisiveis.some((cada) => cada.chave === bruta) ? bruta : 'dados';

  const linhas = aba === 'equipe' ? await lerEquipeDaConta() : [];
  const celulas = aba === 'papeis' ? await lerMatrizDePermissoes() : [];

  return (
    <div className={estilos.base}>
      {/* Uma aba só não é um grupo de abas: sem gestão de equipe, a pessoa vê a
          tela de dados pessoais direto, sem uma navegação de um item. */}
      {abasVisiveis.length > 1 ? (
        <Abas
          abas={abasVisiveis}
          ativa={aba}
          caminho={ROTA.ADMIN_EQUIPE}
          rotulo={EQUIPE.abasRotulo}
        />
      ) : null}

      {aba === 'dados' ? (
        meusDados === null ? (
          // Conta com papel `admin` mas sem linha em `membro_admin`. Não deveria
          // existir — `aceitar_convite_admin` cria as duas juntas —, e se
          // existir, dizer isso é melhor que renderizar campos vazios.
          <EstadoVazio
            titulo="Esta conta não está vinculada à equipe"
            descricao="O vínculo administrativo nasce no aceite do convite. Fale com quem gere a equipe."
          />
        ) : (
          <DadosDoMembro
            nome={meusDados.nome}
            cargo={meusDados.cargo}
            email={identidade.email}
            papelAdmin={meusDados.papelAdmin}
            senhaAlteradaEm={meusDados.senhaAlteradaEm}
            fotoCaminho={meusDados.fotoCaminho}
            fotoUrl={await urlPublicaDoAvatar(meusDados.fotoCaminho, meusDados.atualizadoEm)}
            acao={salvarDadosPessoais}
            acaoDeSenha={trocarSenha}
            acaoDeEmail={trocarEmail}
          />
        )
      ) : null}

      {aba === 'equipe' ? (
        <ListaDaEquipe
          linhas={linhas}
          acaoDePapel={alterarPapel}
          acaoDeAcesso={alterarAcesso}
          acaoDeReenvio={reenviarConviteDaEquipe}
          acaoDeConvidar={
            permissao.podeEscrever ? <ConviteDeMembro acao={convidarMembroDaEquipe} /> : null
          }
        />
      ) : null}

      {aba === 'papeis' ? (
        <MatrizDePermissoes
          celulas={celulas}
          acao={salvarMatriz}
          podeEditar={permissao.podeEscrever}
        />
      ) : null}
    </div>
  );
}
