'use client';

import { Aviso } from '@/componentes/base/Aviso';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { ListaDeServicos } from '../ListaDeServicos';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  preco_feedback: CURADOR_CADASTRO.erroPrecoFeedback,
  preco_servicos: CURADOR_CADASTRO.erroPrecoServicos,
  preco_invalido: CURADOR_CADASTRO.erroPrecoServicos,
};

/**
 * Passo 5 — serviços e preços.
 *
 * A lista de campos é a mesma de 12.6 e mora em `ListaDeServicos`, que carrega
 * as regras do `feedback` obrigatório e do preço `readOnly`. O que este passo
 * acrescenta é o rodapé do wizard e a tradução do erro.
 */
export function Passo5Servicos({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo } = usePasso(acao);

  const erro = motivo === undefined ? undefined : MOTIVOS[motivo];

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {erro !== undefined ? (
        <Aviso tom="erro" titulo={erro}>
          {CURADOR_CADASTRO.notaClaves}
        </Aviso>
      ) : null}

      <ListaDeServicos servicos={estado.servicos} />

      <p className={estilos.nota}>{CURADOR_CADASTRO.notaClaves}</p>

      <AcoesDoPasso
        passo={passo}
        ultimo={false}
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
