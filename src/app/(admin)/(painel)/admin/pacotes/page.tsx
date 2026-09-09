import type { Metadata } from 'next';

import { Aviso } from '@/componentes/base/Aviso';
import { formatar as formatarDinheiro } from '@/lib/dinheiro';
import { lerPermissao, ModuloAdmin } from '@/modulos/admin/permissoes';
import { lerListaDaEquipe } from '@/modulos/pacote/consultas';
import { formatarDesconto, formatarQuantidade, temDesconto } from '@/modulos/pacote/formato';
import { ADMIN_PACOTE_FORMULARIO, ADMIN_PACOTES } from '@/textos/prototipo';

import { ListaDePacotes } from './ListaDePacotes';
import type { LinhaDePacote } from './ListaDePacotes';

export const metadata: Metadata = {
  title: 'Pacotes de Claves · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 21 — pacotes de Claves.
 *
 * Server Component: consulta, formata e entrega strings. Todo `bigint` fica
 * deste lado da fronteira (ver `LinhaDePacote`).
 *
 * A permissão é lida aqui, e não só na Server Action, porque a tela precisa
 * **saber antes de desenhar** se mostra "Novo pacote" e se habilita as ações.
 * É a terceira camada de §5.2; a RLS continua sendo a fronteira real, e a ação
 * confere de novo.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly salvo?: string }>;
}) {
  const { salvo } = await searchParams;
  const { podeLer, podeEscrever } = await lerPermissao(ModuloAdmin.PACOTES);

  if (!podeLer) {
    // Não é 404 nem redirect: a pessoa **é** admin (o middleware garantiu), só
    // não tem este módulo. Dizer isso é mais útil que fingir que a tela não
    // existe, e é o que a matriz da tela 27.4 descreve.
    return (
      <Aviso tom="alerta" titulo="Sem acesso a Pacotes de Claves" estatico>
        Seu papel na equipe não inclui este módulo. Um Administrador pode liberá-lo em Conta e
        equipe.
      </Aviso>
    );
  }

  const { pacotes, ativos, total, valorDaClave } = await lerListaDaEquipe();

  const linhas: readonly LinhaDePacote[] = pacotes.map((pacote) => ({
    id: pacote.id,
    nome: pacote.nome,
    claves: formatarQuantidade(pacote.quantidade),
    valor: formatarDinheiro(pacote.valor),
    desconto: formatarDesconto(pacote.descontoDerivado),
    temDesconto: temDesconto(pacote.descontoDerivado),
    precoPorClave: formatarDinheiro(pacote.precoPorClave),
    ativo: pacote.ativo,
  }));

  return (
    <ListaDePacotes
      linhas={linhas}
      confirmacaoInicial={confirmacaoDeSalvamento(salvo)}
      resumo={ADMIN_PACOTES.resumo(ativos, total)}
      baseDaClave={`Base de 1 Clave por ${formatarDinheiro(valorDaClave)}, com desconto progressivo por volume.`}
      podeEscrever={podeEscrever}
    />
  );
}

/**
 * Confirmação depois de salvar, vinda de `?salvo=`.
 *
 * O protótipo mostra o `flash` no pé da tabela ao voltar do formulário
 * (`this.go('pacotes'); this.flash('Pacote criado. …')`). Aqui a mensagem
 * atravessa a navegação pela query string, e não por estado de cliente, porque
 * o formulário e a lista são páginas diferentes — e porque assim a confirmação
 * sobrevive a um recarregamento, que é o momento em que a pessoa duvida se o
 * salvamento pegou.
 *
 * Valor desconhecido não vira mensagem: um `?salvo=qualquer-coisa` na URL não
 * deve poder afirmar que algo foi salvo.
 */
function confirmacaoDeSalvamento(salvo: string | undefined): string | null {
  if (salvo === 'criado') return ADMIN_PACOTE_FORMULARIO.flashCriado;
  if (salvo === 'atualizado') return ADMIN_PACOTE_FORMULARIO.flashAtualizado;
  return null;
}
