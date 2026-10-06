'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { Campo } from '@dissona/nucleo/componentes/base/Campo';
import { useHrefDoAdmin } from '@dissona/nucleo/componentes/shell/BaseDoAdmin';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { atualizarPacote, criarPacote } from '@/modulos/pacote/acoes';
import { ADMIN_PACOTE_FORMULARIO } from '@dissona/nucleo/textos/prototipo';

import estilos from './FormularioDePacote.module.css';

export type ValoresIniciais = {
  readonly nome: string;
  readonly quantidade: string;
  /** Em reais, com vírgula: `"285,00"`. */
  readonly valor: string;
  readonly desconto: string;
  readonly ativo: boolean;
};

export type PropsFormulario = {
  /** `null` cria; com id, edita. */
  readonly pacoteId: string | null;
  readonly iniciais: ValoresIniciais;
  /** `configuracao.clave_valor_centavos`, em centavos. */
  readonly valorDaClaveCentavos: number;
  readonly podeEscrever: boolean;
};

/**
 * Tela 21.1 — os três campos que se recalculam.
 *
 * O protótipo faz o vaivém em `patchEd(patch, origem)`: mexer no desconto
 * recalcula o valor; mexer no valor recalcula o desconto; mexer na quantidade
 * mantém o desconto e recalcula o valor. Portado com a mesma semântica, e a
 * copy auxiliar de cada campo ("Recalcula o valor", "Recalcula o desconto") é
 * o que torna o comportamento previsível em vez de mágico.
 *
 * **A aritmética daqui é só da tela.** Quem grava é a Server Action, que
 * recalcula o desconto a partir do valor com `servico.descontoDerivado` — a
 * mesma função, em `bigint`. Estes `number` existem para mostrar o número
 * enquanto se digita; nenhum deles chega ao banco.
 */
export function FormularioDePacote({
  pacoteId,
  iniciais,
  valorDaClaveCentavos,
  podeEscrever,
}: PropsFormulario) {
  const router = useRouter();
  const lista = useHrefDoAdmin()(ROTA.ADMIN_PACOTES);
  const [pendente, iniciar] = useTransition();

  const [nome, setNome] = useState(iniciais.nome);
  const [quantidade, setQuantidade] = useState(iniciais.quantidade);
  const [valor, setValor] = useState(iniciais.valor);
  const [desconto, setDesconto] = useState(iniciais.desconto);
  const [ativo, setAtivo] = useState(iniciais.ativo);
  const [erro, setErro] = useState<string | null>(null);
  const [campoComErro, setCampoComErro] = useState<string | null>(null);

  const derivados = useMemo(
    () => calcular(quantidade, valor, valorDaClaveCentavos),
    [quantidade, valor, valorDaClaveCentavos],
  );

  /** Quantidade mudou: preserva o desconto e recalcula o valor. */
  function aoMudarQuantidade(bruto: string) {
    setQuantidade(bruto);
    const base = baseDe(bruto, valorDaClaveCentavos);
    const percentual = numero(desconto);
    if (base !== null && percentual !== null) {
      setValor(paraReais(Math.round((base * (100 - percentual)) / 100)));
    }
  }

  /** Desconto mudou: recalcula o valor. */
  function aoMudarDesconto(bruto: string) {
    setDesconto(bruto);
    const base = baseDe(quantidade, valorDaClaveCentavos);
    const percentual = numero(bruto);
    if (base !== null && percentual !== null) {
      setValor(paraReais(Math.round((base * (100 - percentual)) / 100)));
    }
  }

  /** Valor mudou: recalcula o desconto. */
  function aoMudarValor(bruto: string) {
    setValor(bruto);
    const base = baseDe(quantidade, valorDaClaveCentavos);
    const centavos = paraCentavosDeTexto(bruto);
    if (base !== null && base > 0 && centavos !== null) {
      setDesconto(aparar(((base - centavos) / base) * 100));
    }
  }

  function salvar() {
    setErro(null);
    setCampoComErro(null);

    iniciar(async () => {
      const entrada = { nome, quantidade, valor, ativo };
      const resultado =
        pacoteId === null ? await criarPacote(entrada) : await atualizarPacote(pacoteId, entrada);

      if (resultado.ok) {
        // A confirmação aparece na lista, que é para onde a tela volta — como
        // no protótipo (`this.go('pacotes'); this.flash(...)`).
        router.push(`${lista}?salvo=${pacoteId === null ? 'criado' : 'atualizado'}`);
        return;
      }

      setCampoComErro(resultado.campo ?? null);
      setErro(mensagemDeErro(resultado.campo, resultado.detalhes?.['motivo']));
    });
  }

  return (
    <div className={estilos.tela}>
      <Link className={estilos.voltar} href={lista}>
        <IconeVoltar />
        {ADMIN_PACOTE_FORMULARIO.voltar}
      </Link>

      <div className={estilos.card}>
        <div className={estilos.corpo}>
          <Campo
            rotulo={ADMIN_PACOTE_FORMULARIO.rotuloNome}
            placeholder={ADMIN_PACOTE_FORMULARIO.placeholderNome}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            maxLength={80}
            required
            erro={campoComErro === 'nome' ? (erro ?? undefined) : undefined}
          />

          <div className={estilos.trio}>
            <Campo
              rotulo={ADMIN_PACOTE_FORMULARIO.rotuloQuantidade}
              placeholder={ADMIN_PACOTE_FORMULARIO.placeholderQuantidade}
              inputMode="numeric"
              value={quantidade}
              onChange={(evento) => aoMudarQuantidade(evento.target.value)}
              auxiliar={ADMIN_PACOTE_FORMULARIO.auxiliarBase(derivados.base)}
              required
              erro={campoComErro === 'quantidade' ? (erro ?? undefined) : undefined}
            />

            <Campo
              rotulo={ADMIN_PACOTE_FORMULARIO.rotuloDesconto}
              placeholder={ADMIN_PACOTE_FORMULARIO.placeholderDesconto}
              inputMode="decimal"
              value={desconto}
              onChange={(evento) => aoMudarDesconto(evento.target.value)}
              auxiliar={ADMIN_PACOTE_FORMULARIO.auxiliarDesconto}
            />

            <Campo
              rotulo={ADMIN_PACOTE_FORMULARIO.rotuloValor}
              placeholder={ADMIN_PACOTE_FORMULARIO.placeholderValor}
              inputMode="decimal"
              value={valor}
              onChange={(evento) => aoMudarValor(evento.target.value)}
              auxiliar={ADMIN_PACOTE_FORMULARIO.auxiliarValor}
              required
              erro={campoComErro === 'valor' ? (erro ?? undefined) : undefined}
            />
          </div>

          <div className={estilos.derivados}>
            <Derivado
              rotulo={ADMIN_PACOTE_FORMULARIO.resumoPorClave}
              valor={derivados.porClave}
              destaque
            />
            <Derivado
              rotulo={ADMIN_PACOTE_FORMULARIO.resumoDesconto}
              valor={derivados.descontoAplicado}
            />
            <Derivado rotulo={ADMIN_PACOTE_FORMULARIO.resumoEconomia} valor={derivados.economia} />
          </div>

          {erro !== null && campoComErro === null ? <Aviso tom="erro">{erro}</Aviso> : null}

          <div className={estilos.alternancia}>
            <span className={estilos.alternanciaTextos}>
              <span className={estilos.alternanciaTitulo} id="rotulo-pacote-ativo">
                {ADMIN_PACOTE_FORMULARIO.ativoTitulo}
              </span>
              <span className={estilos.alternanciaDescricao}>
                {ADMIN_PACOTE_FORMULARIO.ativoDescricao}
              </span>
            </span>

            {/*
              `role="switch"` com `aria-checked`, e não um checkbox estilizado.
              É o que o protótipo declara, e é o papel correto: o controle não
              tem estado indeterminado nem participa de um grupo.
            */}
            <button
              type="button"
              role="switch"
              aria-checked={ativo}
              aria-labelledby="rotulo-pacote-ativo"
              className={[estilos.interruptor, ativo ? estilos.interruptorLigado : undefined]
                .filter(Boolean)
                .join(' ')}
              disabled={!podeEscrever}
              onClick={() => setAtivo((atual) => !atual)}
            >
              <span
                aria-hidden="true"
                className={[
                  estilos.botaoDoInterruptor,
                  ativo ? estilos.botaoDoInterruptorLigado : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            </button>
          </div>
        </div>

        <div className={estilos.rodape}>
          <Botao onClick={salvar} carregando={pendente} disabled={!podeEscrever} tamanho="denso">
            {ADMIN_PACOTE_FORMULARIO.salvar}
          </Botao>
          <Botao variante="ghost" onClick={() => router.push(lista)}>
            {ADMIN_PACOTE_FORMULARIO.cancelar}
          </Botao>
          <span className={estilos.notaRodape}>{ADMIN_PACOTE_FORMULARIO.notaRodape}</span>
        </div>
      </div>
    </div>
  );
}

function Derivado({
  rotulo,
  valor,
  destaque = false,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly destaque?: boolean;
}) {
  return (
    <div className={estilos.derivado}>
      <span className={estilos.derivadoRotulo}>{rotulo}</span>
      <span
        className={[estilos.derivadoValor, destaque ? estilos.derivadoDestaque : undefined]
          .filter(Boolean)
          .join(' ')}
      >
        {valor}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aritmética de tela. Em centavos inteiros, como o resto do projeto — o único
// `/ 100` é na formatação.
// ---------------------------------------------------------------------------

const SEM_VALOR = '—';

function numero(bruto: string): number | null {
  const texto = bruto.trim().replace(',', '.');
  if (texto === '' || !/^[0-9]+([.][0-9]+)?$/.test(texto)) return null;
  return Number(texto);
}

function paraCentavosDeTexto(bruto: string): number | null {
  const valor = numero(bruto);
  return valor === null ? null : Math.round(valor * 100);
}

function baseDe(quantidade: string, valorDaClaveCentavos: number): number | null {
  const claves = numero(quantidade);
  if (claves === null || claves <= 0) return null;
  return Math.round(claves * valorDaClaveCentavos);
}

function paraReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

/** `trim2` do protótipo: no máximo duas casas, sem zeros à direita. */
function aparar(valor: number): string {
  return String(Math.round(valor * 100) / 100).replace('.', ',');
}

function moeda(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  );
}

type Derivados = {
  readonly base: string;
  readonly porClave: string;
  readonly descontoAplicado: string;
  readonly economia: string;
};

function calcular(quantidade: string, valor: string, valorDaClaveCentavos: number): Derivados {
  const base = baseDe(quantidade, valorDaClaveCentavos);
  const centavos = paraCentavosDeTexto(valor);
  const claves = numero(quantidade);

  return {
    base: moeda(base ?? 0),
    porClave:
      centavos === null || claves === null || claves <= 0
        ? SEM_VALOR
        : moeda(Math.round(centavos / claves)),
    descontoAplicado:
      base === null || base <= 0 || centavos === null
        ? SEM_VALOR
        : ((base - centavos) / base) * 100 < 0.05
          ? ADMIN_PACOTE_FORMULARIO.resumoSemDesconto
          : `${aparar(((base - centavos) / base) * 100)}%`,
    economia: base === null || centavos === null ? SEM_VALOR : moeda(Math.max(0, base - centavos)),
  };
}

/**
 * Tradução de `CodigoErro` + campo para texto — a View traduz, o serviço não
 * (§8). As mensagens vêm de `textos/prototipo`, onde está registrado que o
 * protótipo não as tem: ele coage em silêncio, e o cenário A2 exige o
 * contrário.
 */
function mensagemDeErro(campo: string | undefined, motivo: unknown): string {
  if (campo === 'nome') return ADMIN_PACOTE_FORMULARIO.erroNomeVazio;
  if (campo === 'quantidade') return ADMIN_PACOTE_FORMULARIO.erroQuantidadeInvalida;
  if (campo === 'valor') {
    return motivo === 'acima_da_base'
      ? ADMIN_PACOTE_FORMULARIO.erroValorAcimaDaBase
      : ADMIN_PACOTE_FORMULARIO.erroValorInvalido;
  }
  return 'Não foi possível salvar o pacote. Confira suas permissões e tente de novo.';
}

function IconeVoltar() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}
