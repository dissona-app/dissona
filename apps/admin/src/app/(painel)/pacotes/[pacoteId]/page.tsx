import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { paraStringDecimal } from '@dissona/nucleo/lib/dinheiro';
import { lerPermissao, ModuloAdmin } from '@dissona/nucleo/modulos/admin/permissoes';
import { lerParaEdicao } from '@dissona/nucleo/modulos/pacote/consultas';
import { formatarQuantidade } from '@dissona/nucleo/modulos/pacote/formato';

import { FormularioDePacote } from '../FormularioDePacote';

export const metadata: Metadata = {
  title: 'Editar pacote · Dissona',
  robots: { index: false, follow: false },
};

/** Tela 21.1 em modo edição. */
export default async function Pagina({
  params,
}: {
  readonly params: Promise<{ readonly pacoteId: string }>;
}) {
  const { pacoteId } = await params;
  const { podeLer, podeEscrever } = await lerPermissao(ModuloAdmin.PACOTES);

  if (!podeLer) {
    return (
      <Aviso tom="alerta" titulo="Sem acesso a Pacotes de Claves" estatico>
        Seu papel na equipe não inclui este módulo.
      </Aviso>
    );
  }

  const dados = await lerParaEdicao(pacoteId);
  // `notFound()` cobre os dois casos indistinguíveis: id que não existe e id
  // que a RLS esconde. Distinguir revelaria a existência da linha.
  if (dados === null) notFound();

  const { pacote, valorDaClave } = dados;

  return (
    <FormularioDePacote
      pacoteId={pacote.id}
      valorDaClaveCentavos={Number(valorDaClave)}
      podeEscrever={podeEscrever}
      iniciais={{
        nome: pacote.nome,
        quantidade: formatarQuantidade(pacote.quantidade),
        valor: paraStringDecimal(pacote.valor).replace('.', ','),
        // O desconto **derivado** do valor, não a coluna: é o que o artista
        // vai efetivamente pagar, e é o que a lista mostra.
        desconto: String(pacote.descontoDerivado).replace('.', ','),
        ativo: pacote.ativo,
      }}
    />
  );
}
