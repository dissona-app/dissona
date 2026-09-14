'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Checkbox } from '@/componentes/base/Checkbox';
import { EstadoVazio } from '@/componentes/base/EstadoVazio';
import { Painel } from '@/componentes/base/Painel';
import { SeloClasse } from '@/componentes/base/SeloClasse';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { ROTA } from '@/lib/guarda-rota';
import { SELECAO as TEXTOS } from '@/textos/prototipo';

import estilos from './SelecaoDeCuradores.module.css';

/** Um curador na lista, **já formatado no servidor**. */
export type CuradorNaLista = {
  readonly id: string;
  readonly nome: string;
  readonly classe: 'bronze' | 'prata' | 'ouro';
  readonly precoBase: string;
  readonly opcionais: readonly {
    readonly tipo: string;
    readonly rotulo: string;
    readonly preco: string;
  }[];
};

export type PropsSelecaoDeCuradores = {
  readonly faixaId: string;
  readonly curadores: readonly CuradorNaLista[];
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

const MOTIVOS: Readonly<Record<string, string>> = {
  selecao_vazia: TEXTOS.erroSelecaoVazia,
  saldo_insuficiente: TEXTOS.erroSaldo,
  curador_invalido: TEXTOS.erroCuradorInvalido,
  servico_feedback_obrigatorio: TEXTOS.erroSemFeedback,
  faixa_situacao_invalida: TEXTOS.erroFaixaInvalida,
};

/**
 * Placeholder da seleção de curadores.
 *
 * É aqui que as Claves saem: `confirmar_selecao_curadores` debita o ledger,
 * cria os envios e notifica, tudo numa transação.
 *
 * O total **não** é somado no cliente. Cada curador mostra o seu preço, e o
 * valor final é o que a RPC calcula a partir de `servico_curador` — somar aqui
 * daria um segundo lugar para a mesma aritmética, e uma chance de os dois
 * discordarem.
 */
export function SelecaoDeCuradores({ faixaId, curadores, acao }: PropsSelecaoDeCuradores) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [marcados, setMarcados] = useState<readonly string[]>([]);

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const motivo = falha?.detalhes?.['motivo'];
  const erro =
    falha === null
      ? null
      : ((typeof motivo === 'string' ? MOTIVOS[motivo] : undefined) ??
        MOTIVOS[falha.codigo] ??
        TEXTOS.erroCuradorInvalido);

  if (curadores.length === 0) {
    return (
      <EstadoVazio
        titulo={TEXTOS.vazioTitulo}
        descricao={TEXTOS.vazioDescricao}
        acao={
          <BotaoLink href={`${ROTA.ARTISTA_ENVIAR}/${faixaId}/revisao`} variante="secundario">
            {TEXTOS.voltar}
          </BotaoLink>
        }
      />
    );
  }

  return (
    <form action={enviar} className={estilos.base} noValidate>
      <input type="hidden" name="faixaId" value={faixaId} />

      {erro !== null ? <Aviso tom="erro">{erro}</Aviso> : null}

      <Painel titulo={TEXTOS.titulo} sublegenda={TEXTOS.subtitulo}>
        <ul className={estilos.lista}>
          {curadores.map((curador) => {
            const marcado = marcados.includes(curador.id);
            return (
              <li key={curador.id} className={estilos.item}>
                <div className={estilos.cabecalho}>
                  <Checkbox
                    name="curador"
                    value={curador.id}
                    checked={marcado}
                    onChange={(e) =>
                      setMarcados((atuais) =>
                        e.target.checked
                          ? [...atuais, curador.id]
                          : atuais.filter((id) => id !== curador.id),
                      )
                    }
                  >
                    {curador.nome}
                  </Checkbox>
                  <SeloClasse classe={curador.classe} />
                </div>

                <p className={estilos.servicoBase}>
                  {TEXTOS.servicoObrigatorio} · {curador.precoBase}
                </p>

                {marcado && curador.opcionais.length > 0 ? (
                  <ul className={estilos.opcionais}>
                    {curador.opcionais.map((opcional) => (
                      <li key={opcional.tipo}>
                        <Checkbox name={`servico:${curador.id}`} value={opcional.tipo}>
                          {opcional.rotulo} · {opcional.preco}
                        </Checkbox>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Painel>

      <div className={estilos.acoes}>
        <BotaoLink href={`${ROTA.ARTISTA_ENVIAR}/${faixaId}/revisao`} variante="secundario">
          {TEXTOS.voltar}
        </BotaoLink>
        <Botao type="submit" carregando={pendente} disabled={marcados.length === 0}>
          {TEXTOS.confirmar}
        </Botao>
      </div>
    </form>
  );
}
