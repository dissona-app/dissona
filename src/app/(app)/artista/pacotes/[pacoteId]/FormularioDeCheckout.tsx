'use client';

import type { FormEvent } from 'react';
import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Campo } from '@/componentes/base/Campo';
import { Grupo } from '@/componentes/base/Grupo';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import type { DesfechoDaCompra, MeioPagamento, ResultadoSimulado } from '@/modulos/claves/tipos';
import { CHECKOUT as TEXTOS } from '@/textos/prototipo';

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
  readonly acao: (entrada: unknown) => Promise<ResultadoDeAcao<DesfechoDaCompra>>;
};

type ErrosDoCartao = Readonly<Partial<Record<'numero' | 'nome' | 'validade' | 'cvv', string>>>;

const SEM_ERRO: ErrosDoCartao = {};

const MENSAGEM: Readonly<Partial<Record<string, string>>> = {
  [CodigoErro.PAGAMENTO_INDISPONIVEL]: TEXTOS.erroIndisponivel,
  [CodigoErro.NAO_ENCONTRADO]: TEXTOS.erroPacote,
  [CodigoErro.PACOTE_EXCLUIDO]: TEXTOS.erroPacote,
};

/** Dígitos do número, sem os espaços que a máscara acrescenta. */
function digitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida o cartão **no cliente**, e só o formato.
 *
 * O protótipo, sendo mock, faz o contrário: `caConfirmar` preenche os campos
 * inválidos com valores fictícios (`'4539 8123 4567 8901'`, `'Aurora
 * Menezes'`) e segue em frente. É a mesma coerção silenciosa que a tela 21.1
 * fazia com o preço do pacote, e a razão de não a copiar é a mesma — ver
 * `07-pendencias-e-divergencias.md`, Parte B.1.
 *
 * Só formato porque quem autoriza é o banco: um cartão bem formatado e sem
 * saldo é exatamente o caminho "Recusado" que o cenário B2 pede.
 */
function validarCartao(numero: string, nome: string, validade: string, cvv: string): ErrosDoCartao {
  const erros: Record<string, string> = {};

  if (digitos(numero).length < 13 || digitos(numero).length > 19) {
    erros['numero'] = TEXTOS.erroCartaoNumero;
  }
  if (nome.trim() === '') erros['nome'] = TEXTOS.erroCartaoNome;
  if (!/^\d{2}\/?\d{2}$/.test(validade.trim())) erros['validade'] = TEXTOS.erroCartaoValidade;
  if (digitos(cvv).length < 3) erros['cvv'] = TEXTOS.erroCartaoCvv;

  return erros;
}

/**
 * 5.2 · Checkout.
 *
 * ## Os campos do cartão não têm `name`, e isso é o requisito
 *
 * "Checkout com cartão tokenizado, **sem persistir dados do cartão**" é o item
 * da R2. A forma mais forte de não persistir é o dado não sair do navegador:
 * um `<input>` sem `name` não entra no `FormData`, então número, titular,
 * validade e código de segurança não atravessam a rede, não chegam à Server
 * Action, não aparecem em log de servidor e não existem para ninguém gravar
 * por engano. É o mesmo mecanismo que o `CampoNota` usa para não enviar `0` de
 * um critério nunca tocado.
 *
 * Quando o Asaas entrar, é o SDK dele que lê estes campos no navegador e
 * devolve um **token** — e é o token que ganha um `name`. A troca é de um
 * campo; o resto da tela não muda.
 *
 * O preço disso é que esta tela exige JavaScript, ao contrário do resto do
 * produto. Um checkout de cartão sem JS teria de mandar o PAN para o servidor,
 * que é precisamente o que não se quer.
 */
export function FormularioDeCheckout({
  pacoteId,
  resumo,
  simulado,
  acao,
}: PropsFormularioDeCheckout) {
  const [resultado, enviar, pendente] = useActionState<
    ResultadoDeAcao<DesfechoDaCompra> | null,
    FormData
  >(async (_anterior, dados) => acao(Object.fromEntries(dados)), null);

  const [meio, setMeio] = useState<MeioPagamento>('cartao');
  const [simulacao, setSimulacao] = useState<ResultadoSimulado>('aprovado');

  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [erros, setErros] = useState<ErrosDoCartao>(SEM_ERRO);

  const aprovado = resultado !== null && resultado.ok ? resultado.dados : null;
  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const recusado = falha?.codigo === CodigoErro.PAGAMENTO_RECUSADO;
  const erroGeral =
    falha === null || recusado ? null : (MENSAGEM[falha.codigo] ?? TEXTOS.erroGenerico);

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    if (meio !== 'cartao') {
      setErros(SEM_ERRO);
      return;
    }
    const encontrados = validarCartao(numero, nome, validade, cvv);
    setErros(encontrados);
    // Cancela a Server Action: `onSubmit` corre antes do `action` do form, e
    // `preventDefault` impede que ele chegue a rodar.
    if (Object.keys(encontrados).length > 0) evento.preventDefault();
  }

  return (
    <form action={enviar} onSubmit={aoEnviar} className={estilos.base} noValidate>
      <input type="hidden" name="pacoteId" value={pacoteId} />
      <input type="hidden" name="meio" value={meio} />
      {simulado ? <input type="hidden" name="simulacao" value={simulacao} /> : null}

      <BotaoLink href={ROTA.ARTISTA_PACOTES} variante="ghost" tamanho="sm">
        {TEXTOS.trocarDePacote}
      </BotaoLink>

      {erroGeral !== null ? <Aviso tom="erro">{erroGeral}</Aviso> : null}

      <div className={estilos.colunas}>
        <Painel titulo={TEXTOS.meioRotulo} nivel={2}>
          <div className={estilos.pagamento}>
            <Grupo
              rotulo={TEXTOS.meioRotulo}
              rotuloOculto
              valor={meio}
              onMudar={setMeio}
              opcoes={[
                { valor: 'cartao', rotulo: TEXTOS.meios.cartao },
                { valor: 'pix', rotulo: TEXTOS.meios.pix },
              ]}
            />

            {meio === 'cartao' ? (
              <div className={estilos.cartao}>
                <div className={estilos.linhaInteira}>
                  <Campo
                    rotulo={TEXTOS.numero}
                    placeholder={TEXTOS.numeroDica}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={numero}
                    erro={erros.numero}
                    onChange={(evento) =>
                      setNumero(evento.target.value.replace(/[^0-9 ]/g, '').slice(0, 19))
                    }
                  />
                </div>
                <div className={estilos.linhaInteira}>
                  <Campo
                    rotulo={TEXTOS.nome}
                    placeholder={TEXTOS.nomeDica}
                    autoComplete="cc-name"
                    value={nome}
                    erro={erros.nome}
                    onChange={(evento) => setNome(evento.target.value)}
                  />
                </div>
                <Campo
                  rotulo={TEXTOS.validade}
                  placeholder={TEXTOS.validadeDica}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={validade}
                  erro={erros.validade}
                  onChange={(evento) =>
                    setValidade(evento.target.value.replace(/[^0-9/]/g, '').slice(0, 5))
                  }
                />
                <Campo
                  rotulo={TEXTOS.cvv}
                  placeholder={TEXTOS.cvvDica}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cvv}
                  erro={erros.cvv}
                  onChange={(evento) => setCvv(digitos(evento.target.value).slice(0, 4))}
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
                  {/* O código copia e cola nasce no provedor, em
                      `pedido_clave.pix_payload`. Desabilitado com o motivo
                      visível, e não escondido: a forma da tela não muda a cada
                      entrega — é o mesmo tratamento que "Dados de cobrança"
                      recebe em 7.2. */}
                  <Botao
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    disabled
                    title={TEXTOS.pixPendente}
                  >
                    {TEXTOS.pixCopiar}
                  </Botao>
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

          {/* Um botão só nos três estados. O protótipo troca "Confirmar
              compra" por um bloco de status e some com o botão; aqui ele
              permanece e vira "Tentar de novo" na recusa, porque é o que a
              própria copy do protótipo oferece e porque tirar o alvo do lugar
              depois do erro obriga a procurá-lo de novo. No aprovado ele sai:
              não há segunda compra a confirmar, e os dois caminhos daqui são
              a Carteira e o extrato. */}
          {aprovado === null ? (
            <Botao type="submit" carregando={pendente} blocoInteiro>
              {pendente ? TEXTOS.processando : recusado ? TEXTOS.tentarDeNovo : TEXTOS.confirmar}
            </Botao>
          ) : null}
        </div>
      </div>
    </form>
  );
}
