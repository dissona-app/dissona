import type { Metadata } from 'next';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { lerPermissao, ModuloAdmin } from '@dissona/nucleo/modulos/admin/permissoes';
import { lerValorDaClave } from '@dissona/nucleo/modulos/pacote/consultas';

import { FormularioDePacote } from '../FormularioDePacote';

export const metadata: Metadata = {
  title: 'Novo pacote · Dissona',
  robots: { index: false, follow: false },
};

/** Tela 21.1 em modo criação. */
export default async function Pagina() {
  const { podeEscrever } = await lerPermissao(ModuloAdmin.PACOTES);

  if (!podeEscrever) {
    return (
      <Aviso tom="alerta" titulo="Sem permissão para criar pacotes" estatico>
        Seu papel na equipe pode ver os pacotes, mas não alterá-los.
      </Aviso>
    );
  }

  const valorDaClave = await lerValorDaClave();

  return (
    <FormularioDePacote
      pacoteId={null}
      valorDaClaveCentavos={Number(valorDaClave)}
      podeEscrever
      iniciais={{
        nome: '',
        quantidade: '',
        valor: '',
        // `'0'`, e não `''`: é o que o protótipo faz (`desc: '0'`), e é o que
        // faz o primeiro dígito digitado em "Qtd de Claves" já produzir um
        // valor — sem desconto, mas coerente.
        desconto: '0',
        ativo: true,
      }}
    />
  );
}
