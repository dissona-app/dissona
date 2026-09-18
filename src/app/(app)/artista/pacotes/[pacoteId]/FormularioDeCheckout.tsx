'use client';

import type { FormEvent } from 'react';
import { useActionState, useEffect, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Campo } from '@/componentes/base/Campo';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { cpfValido, mascararCpf, mascararTelefone, telefoneValido } from '@/lib/mascaras';
import { luhnValido } from '@/modulos/claves/esquemas';
import type {
  AcompanhamentoDoPix,
  DesfechoDaCompra,
  MeioPagamento,
  ResultadoSimulado,
} from '@/modulos/claves/tipos';
import type { CartaoSalvo } from '@/modulos/claves/consultas';
import { CARTAO_SALVO, CHECKOUT as TEXTOS } from '@/textos/prototipo';

import estilos from './FormularioDeCheckout.module.css';

export type ResumoNaTela = {
  readonly quantidade: string;
  readonly bruto: string;
  /** `null` quando o pacote não tem desconto — a linha some, como no protótipo. */
  readonly desconto: string | null;
  readonly total: string;
  readonly porClave: string;
};

export type PropsFormularioDeCheckout = {
  readonly pacoteId: string;
  readonly resumo: ResumoNaTela;
  /** Mostra o seletor "Simular resultado" e a nota de que nada é cobrado. */
  readonly simulado: boolean;
  /**
   * O cartão que o Asaas já tokenizou numa compra anterior, se houver.
   *
   * Quando existe, ele é a opção **padrão**: é o caminho em que o número do
   * cartão não trafega de novo.
   */
  readonly cartaoSalvo: CartaoSalvo | null;
  readonly acao: (entrada: unknown) => Promise<ResultadoDeAcao<DesfechoDaCompra>>;
  readonly acompanhar: (pedidoId: string) => Promise<ResultadoDeAcao<AcompanhamentoDoPix>>;
};

/**
 * A forma de pagamento **como a tela a oferece**.
 *
 * `cartao_salvo` não é valor de `meio_pagamento` no banco: ali um pagamento com
 * token é `cartao` como outro qualquer. A tradução é da ação.
 */
type MeioNaTela = MeioPagamento | 'cartao_salvo';

type Campos = 'cpf' | 'numero' | 'titular' | 'validade' | 'cvv' | 'telefone' | 'cep';
type Erros = Readonly<Partial<Record<Campos, string>>>;

const SEM_ERRO: Erros = {};

/** Código do schema (`esquemas.ts`) → texto. */
const MOTIVOS: Readonly<Record<string, string>> = {
  cpf_invalido: TEXTOS.erroCpf,
  numero_invalido: TEXTOS.erroCartaoNumero,
  titular_vazio: TEXTOS.erroCartaoNome,
  validade_invalida: TEXTOS.erroCartaoValidade,
  cvv_invalido: TEXTOS.erroCartaoCvv,
  telefone_invalido: TEXTOS.erroTelefone,
  cep_invalido: TEXTOS.erroCep,
};

const MENSAGEM: Readonly<Partial<Record<string, string>>> = {
  [CodigoErro.PAGAMENTO_INDISPONIVEL]: TEXTOS.erroIndisponivel,
  [CodigoErro.NAO_ENCONTRADO]: TEXTOS.erroPacote,
  [CodigoErro.PACOTE_EXCLUIDO]: TEXTOS.erroPacote,
};

/** De quanto em quanto tempo a tela do Pix pergunta se o pagamento caiu. */
const INTERVALO_DO_PIX_MS = 4000;

function digitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida **no cliente**, e só o formato — a mesma regra do schema do servidor,
 * que é quem decide. Aqui ela só evita uma ida e volta para dizer "CPF
 * inválido".
 */
function validar(meio: MeioNaTela, valores: Readonly<Record<Campos, string>>): Erros {
  const erros: Partial<Record<Campos, string>> = {};
  if (!cpfValido(valores.cpf)) erros.cpf = TEXTOS.erroCpf;
  if (meio !== 'cartao') return erros;

  if (!luhnValido(valores.numero)) erros.numero = TEXTOS.erroCartaoNumero;
  if (valores.titular.trim() === '') erros.titular = TEXTOS.erroCartaoNome;
  if (!/^(0[1-9]|1[0-2])\/?\d{2}$/.test(valores.validade.trim())) {
    erros.validade = TEXTOS.erroCartaoValidade;
  }
  if (![3, 4].includes(digitos(valores.cvv).length)) erros.cvv = TEXTOS.erroCartaoCvv;
  if (!telefoneValido(valores.telefone)) erros.telefone = TEXTOS.erroTelefone;
  if (digitos(valores.cep).length !== 8) erros.cep = TEXTOS.erroCep;
  return erros;
}

function mascararCep(valor: string): string {
  const d = digitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * 5.2 · Checkout.
 *
 * ## Os três desfechos
 *
 * Cartão (ou simulação) volta **aprovado** ou **recusado** na própria
 * resposta. Pix volta **aguardando**: a tela troca o formulário pelo QR code e
 * pelo copia e cola, e pergunta ao servidor de tempos em tempos se o webhook
 * do Asaas já confirmou — quando confirma, mostra o mesmo "Pagamento aprovado"
 * do cartão.
 *
 * ## Dados do cartão
 *
 * Os campos têm `name` e vão à Server Action, que os repassa ao Asaas e os
 * descarta — e isso vale para a **primeira** compra com um cartão. Depois dela
 * o Asaas devolve um token, que vira a opção padrão desta tela e dispensa os
 * campos. Ver `modulos/claves/esquemas.ts`.
 */
export function FormularioDeCheckout({
  pacoteId,
  resumo,
  simulado,
  acao,
  acompanhar,
  cartaoSalvo,
}: PropsFormularioDeCheckout) {
  const [resultado, enviar, pendente] = useActionState<
    ResultadoDeAcao<DesfechoDaCompra> | null,
    FormData
  >(async (_anterior, dados) => acao(Object.fromEntries(dados)), null);

  // A escolha da tela tem três valores; `meio_pagamento` no banco tem dois. A
  // ação traduz — ver `comprarClaves`.
  const [meio, setMeio] = useState<MeioNaTela>(cartaoSalvo === null ? 'cartao' : 'cartao_salvo');
  const [simulacao, setSimulacao] = useState<ResultadoSimulado>('aprovado');

  const [valores, setValores] = useState<Record<Campos, string>>({
    cpf: '',
    numero: '',
    titular: '',
    validade: '',
    cvv: '',
    telefone: '',
    cep: '',
  });
  const [erros, setErros] = useState<Erros>(SEM_ERRO);
  const [acompanhamento, setAcompanhamento] = useState<AcompanhamentoDoPix | null>(null);
  const [copiado, setCopiado] = useState(false);

  const desfecho = resultado !== null && resultado.ok ? resultado.dados : null;
  const pix = desfecho?.situacao === 'aguardando_pix' ? desfecho : null;

  const aprovado =
    desfecho?.situacao === 'aprovado'
      ? desfecho
      : acompanhamento?.situacao === 'aprovado'
        ? acompanhamento
        : null;
  const pixVencido = acompanhamento?.situacao === 'recusado';

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const recusado = falha?.codigo === CodigoErro.PAGAMENTO_RECUSADO;
  const errosDoServidor = falha?.campos;
  const erroGeral =
    falha === null || recusado || errosDoServidor !== undefined
      ? null
      : (MENSAGEM[falha.codigo] ?? TEXTOS.erroGenerico);

  const pedidoDoPix = pix?.pedidoId ?? null;

  // Acompanha o Pix até ele sair de "aguardando". Um `setInterval` simples:
  // a consulta é barata, e o que ela lê é uma linha só.
  useEffect(() => {
    if (pedidoDoPix === null) return;
    let ativo = true;
    const id = setInterval(() => {
      void acompanhar(pedidoDoPix).then((resposta) => {
        if (!ativo || !resposta.ok || resposta.dados.situacao === 'aguardando') return;
        setAcompanhamento(resposta.dados);
        clearInterval(id);
      });
    }, INTERVALO_DO_PIX_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [pedidoDoPix, acompanhar]);

  const erroDe = (campo: Campos): string | undefined => {
    const doServidor = errosDoServidor?.[campo];
    return erros[campo] ?? (doServidor === undefined ? undefined : MOTIVOS[doServidor]);
  };

  const mudar = (campo: Campos, valor: string) =>
    setValores((atual) => ({ ...atual, [campo]: valor }));

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    const encontrados = validar(meio, valores);
    setErros(encontrados);
    // `onSubmit` corre antes do `action` do form; `preventDefault` o cancela.
    if (Object.keys(encontrados).length > 0) evento.preventDefault();
  }

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const formularioAtivo = pix === null && aprovado === null;

  return (
    <form action={enviar} onSubmit={aoEnviar} className={estilos.base} noValidate>
      <input type="hidden" name="pacoteId" value={pacoteId} />
      <input type="hidden" name="meio" value={meio} />
      {meio === 'cartao_salvo' && cartaoSalvo !== null ? (
        <input type="hidden" name="cartaoId" value={cartaoSalvo.id} />
      ) : null}
      {simulado ? <input type="hidden" name="simulacao" value={simulacao} /> : null}

      <BotaoLink href={ROTA.ARTISTA_PACOTES} variante="ghost" tamanho="sm">
        {TEXTOS.trocarDePacote}
      </BotaoLink>

      {erroGeral !== null ? <Aviso tom="erro">{erroGeral}</Aviso> : null}

      <div className={estilos.colunas}>
        <Painel titulo={TEXTOS.meioRotulo} nivel={2}>
          <div className={estilos.pagamento}>
            {pix !== null ? (
              <div className={estilos.pix}>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI do QR, sem otimização possível */}
                <img
                  className={estilos.qrImagem}
                  src={`data:image/png;base64,${pix.pixQr}`}
                  alt={TEXTOS.pixQrAlt}
                  width={168}
                  height={168}
                />
                <div className={estilos.pixCorpo}>
                  <p className={estilos.pixTitulo}>{TEXTOS.pixAguardandoTitulo}</p>
                  <p className={estilos.nota}>{TEXTOS.pixAguardandoTexto}</p>
                  <Campo rotulo={TEXTOS.pixCodigoRotulo} value={pix.pixPayload} readOnly denso />
                  <Botao
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => void copiarCodigo(pix.pixPayload)}
                  >
                    {copiado ? TEXTOS.pixCopiado : TEXTOS.pixCopiar}
                  </Botao>
                  {pixVencido ? <Aviso tom="alerta">{TEXTOS.pixExpirado}</Aviso> : null}
                </div>
              </div>
            ) : (
              <>
                <Grupo
                  rotulo={TEXTOS.meioRotulo}
                  rotuloOculto
                  valor={meio}
                  onMudar={(valor) => {
                    // `Grupo` devolve `string`; as opções são montadas logo
                    // abaixo e só carregam os três valores de `MeioNaTela`.
                    setMeio(valor as MeioNaTela);
                    setErros(SEM_ERRO);
                  }}
                  opcoes={[
                    ...(cartaoSalvo === null
                      ? []
                      : [
                          {
                            valor: 'cartao_salvo',
                            rotulo: CARTAO_SALVO.opcao(
                              cartaoSalvo.bandeira,
                              cartaoSalvo.ultimosDigitos,
                            ),
                          },
                        ]),
                    { valor: 'cartao', rotulo: TEXTOS.meios.cartao },
                    { valor: 'pix', rotulo: TEXTOS.meios.pix },
                  ]}
                />

                <Campo
                  name="cpf"
                  rotulo={TEXTOS.cpf}
                  placeholder={TEXTOS.cpfDica}
                  auxiliar={TEXTOS.cpfNota}
                  inputMode="numeric"
                  value={valores.cpf}
                  erro={erroDe('cpf')}
                  onChange={(evento) => mudar('cpf', mascararCpf(evento.target.value))}
                />

                {meio === 'cartao_salvo' ? (
                  <p className={estilos.nota}>{CARTAO_SALVO.notaNoCheckout}</p>
                ) : null}

                {meio === 'cartao' ? (
                  <div className={estilos.cartao}>
                    <div className={estilos.linhaInteira}>
                      <Campo
                        name="numero"
                        rotulo={TEXTOS.numero}
                        placeholder={TEXTOS.numeroDica}
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={valores.numero}
                        erro={erroDe('numero')}
                        onChange={(evento) =>
                          mudar('numero', evento.target.value.replace(/[^0-9 ]/g, '').slice(0, 23))
                        }
                      />
                    </div>
                    <div className={estilos.linhaInteira}>
                      <Campo
                        name="titular"
                        rotulo={TEXTOS.nome}
                        placeholder={TEXTOS.nomeDica}
                        autoComplete="cc-name"
                        value={valores.titular}
                        erro={erroDe('titular')}
                        onChange={(evento) => mudar('titular', evento.target.value)}
                      />
                    </div>
                    <Campo
                      name="validade"
                      rotulo={TEXTOS.validade}
                      placeholder={TEXTOS.validadeDica}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={valores.validade}
                      erro={erroDe('validade')}
                      onChange={(evento) =>
                        mudar('validade', evento.target.value.replace(/[^0-9/]/g, '').slice(0, 5))
                      }
                    />
                    <Campo
                      name="cvv"
                      rotulo={TEXTOS.cvv}
                      placeholder={TEXTOS.cvvDica}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={valores.cvv}
                      erro={erroDe('cvv')}
                      onChange={(evento) => mudar('cvv', digitos(evento.target.value).slice(0, 4))}
                    />
                    <Campo
                      name="telefone"
                      rotulo={TEXTOS.telefone}
                      placeholder={TEXTOS.telefoneDica}
                      inputMode="tel"
                      autoComplete="tel-national"
                      value={valores.telefone}
                      erro={erroDe('telefone')}
                      onChange={(evento) =>
                        mudar('telefone', mascararTelefone(evento.target.value))
                      }
                    />
                    <Campo
                      name="cep"
                      rotulo={TEXTOS.cep}
                      placeholder={TEXTOS.cepDica}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={valores.cep}
                      erro={erroDe('cep')}
                      onChange={(evento) => mudar('cep', mascararCep(evento.target.value))}
                    />
                    <p className={[estilos.nota, estilos.linhaInteira].join(' ')}>
                      {TEXTOS.cartaoNota}
                    </p>
                  </div>
                ) : (
                  <div className={estilos.pix}>
                    <span className={estilos.qr} aria-hidden="true">
                      {TEXTOS.pixQr}
                    </span>
                    <div>
                      <p className={estilos.pixTitulo}>{TEXTOS.pixTitulo}</p>
                      <p className={estilos.nota}>{TEXTOS.pixDescricao}</p>
                      <p className={estilos.nota}>{TEXTOS.pixPendente}</p>
                    </div>
                  </div>
                )}

                {simulado ? (
                  <div className={estilos.simulacao}>
                    <Grupo
                      rotulo={TEXTOS.simularRotulo}
                      valor={simulacao}
                      onMudar={setSimulacao}
                      opcoes={[
                        { valor: 'aprovado', rotulo: TEXTOS.simulacoes.aprovado },
                        { valor: 'recusado', rotulo: TEXTOS.simulacoes.recusado },
                      ]}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Painel>

        <div className={estilos.lateral}>
          <Painel titulo={TEXTOS.resumoTitulo} nivel={2}>
            <dl className={estilos.resumo}>
              <div className={estilos.linha}>
                <dt>{resumo.quantidade}</dt>
                <dd>{resumo.bruto}</dd>
              </div>
              {resumo.desconto !== null ? (
                <div className={estilos.linha}>
                  <dt className={estilos.nota}>{TEXTOS.desconto}</dt>
                  <dd className={estilos.economia}>{resumo.desconto}</dd>
                </div>
              ) : null}
              <div className={[estilos.linha, estilos.totalLinha].join(' ')}>
                <dt>{TEXTOS.total}</dt>
                <dd className={estilos.total}>{resumo.total}</dd>
              </div>
            </dl>
            <p className={estilos.nota}>{resumo.porClave}</p>
          </Painel>

          {aprovado !== null ? (
            <Aviso tom="sucesso" titulo={TEXTOS.aprovadoTitulo}>
              <p className={estilos.desfecho}>
                {TEXTOS.aprovadoTexto(aprovado.claves, aprovado.saldo)}
              </p>
              <div className={estilos.acoes}>
                <BotaoLink href={ROTA.ARTISTA_CARTEIRA}>{TEXTOS.irParaCarteira}</BotaoLink>
                <BotaoLink href={ROTA.ARTISTA_EXTRATO} variante="secundario">
                  {TEXTOS.verNoExtrato}
                </BotaoLink>
              </div>
            </Aviso>
          ) : null}

          {recusado ? (
            <Aviso tom="erro" titulo={TEXTOS.recusadoTitulo}>
              <p className={estilos.desfecho}>{TEXTOS.recusadoTexto}</p>
              <p className={estilos.nota}>{TEXTOS.recusadoApoio}</p>
            </Aviso>
          ) : null}

          {/* Um botão só. Some no aprovado (não há segunda compra a confirmar)
              e enquanto o Pix aguarda (confirmar de novo geraria outra
              cobrança). Na recusa vira "Tentar de novo". */}
          {formularioAtivo ? (
            <Botao type="submit" carregando={pendente} blocoInteiro>
              {pendente ? TEXTOS.processando : recusado ? TEXTOS.tentarDeNovo : TEXTOS.confirmar}
            </Botao>
          ) : null}
        </div>
      </div>
    </form>
  );
}
