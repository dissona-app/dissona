import { Abas } from '@/componentes/base/Abas';
import { Aviso } from '@/componentes/base/Aviso';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { ROTA } from '@/lib/guarda-rota';
import { Papel } from '@/lib/papeis';
import {
  encerrarSessaoDeOutroDispositivo,
  excluirMinhaConta,
  exportarDadosDaConta,
  trocarEmail,
  trocarSenha,
} from '@/modulos/conta/acoes';
import type { CartaoSalvo } from '@/modulos/claves/consultas';
import type { SessaoAtiva } from '@/modulos/conta/consultas';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { alternarCanalDeEvento, definirIdiomaDaConta } from '@/modulos/preferencias/acoes';
import type { Preferencias } from '@/modulos/preferencias/consultas';
import { CONTA } from '@/textos/prototipo';

import { CartaoSalvoNaConta } from './CartaoSalvoNaConta';

import { CartaoDeConta } from './CartaoDeConta';
import { PainelDePreferencias } from './PainelDePreferencias';
import { PerfilDoCurador } from './PerfilDoCurador';
import { CartaoDeCredencial } from './CartaoDeCredencial';
import { CartaoDeExclusao } from './CartaoDeExclusao';
import { PainelDeSessoes } from './PainelDeSessoes';
import estilos from './TelaDeConta.module.css';

/**
 * As abas, que **não** são as mesmas nos dois ambientes.
 *
 * O curador tem "Perfil" (17.1); o artista não, porque no protótipo dele o
 * perfil é rota própria com item na sidebar (`/artista/perfil`). Cada lado
 * segue o seu protótipo — ver o comentário de `CONTA.abas.perfil`.
 */
const ABAS_COMUNS = [
  { chave: 'dados', rotulo: CONTA.abas.dados },
  { chave: 'preferencias', rotulo: CONTA.abas.preferencias },
  { chave: 'seguranca', rotulo: CONTA.abas.seguranca },
] as const;

const ABA_PERFIL = { chave: 'perfil', rotulo: CONTA.abas.perfil } as const;

export type AmbienteDeConta = Extract<Papel, 'artista' | 'curador'>;

export type AbaDeConta = 'perfil' | (typeof ABAS_COMUNS)[number]['chave'];

function abasDe(ambiente: AmbienteDeConta): readonly { chave: AbaDeConta; rotulo: string }[] {
  return ambiente === 'curador' ? [ABA_PERFIL, ...ABAS_COMUNS] : ABAS_COMUNS;
}

/**
 * Valida o `?aba=` **contra o ambiente**, e não contra a união inteira.
 *
 * Sem o ambiente, `/artista/conta?aba=perfil` passaria na checagem e cairia
 * numa aba que o artista não tem — tela em branco, sem erro. Valor inválido
 * cai em `dados`, que é a decisão que as duas páginas já tomavam.
 */
export function ehAbaDeConta(
  valor: string | undefined,
  ambiente: AmbienteDeConta,
): valor is AbaDeConta {
  return abasDe(ambiente).some((aba) => aba.chave === valor);
}

export type PropsTelaDeConta = {
  /** Decide o bloco financeiro e se o convite ao papel de curador aparece. */
  readonly ambiente: AmbienteDeConta;
  /** Caminho da própria tela — as abas são links para ele. */
  readonly caminho: string;
  readonly aba: AbaDeConta;
  readonly email: string;
  readonly papeis: readonly Papel[];
  readonly sessoes: readonly SessaoAtiva[];
  /**
   * Cadastro do curador, para a aba Perfil (17.1). Só o ambiente do curador o
   * passa, e só quando a aba aberta é essa — as outras abas não leem o
   * cadastro, e cobrá-lo delas seria uma consulta por navegação de aba.
   */
  readonly cadastroDoCurador?: EstadoDoCadastro | null;
  /**
   * O cartão guardado, para o bloco de cobrança do artista (7.2).
   *
   * `undefined` no curador, cujo bloco financeiro é de **recebimento** e não
   * tem cartão nenhum.
   */
  readonly cartaoSalvo?: CartaoSalvo | null;
  /** Remove o cartão. Vem junto com `cartaoSalvo`. */
  readonly acaoDeRemoverCartao?: ((dados: FormData) => Promise<ResultadoDeAcao>) | undefined;
  /** Catálogo de avisos e idioma, para a aba Preferências (7.3 / 17.3). */
  readonly preferencias?: Preferencias | null;
};

/**
 * Conta e configurações — 7.2/7.4 no artista e 17.2/17.4 no curador.
 *
 * Uma tela para os dois ambientes porque é uma tela só: o protótipo escreve os
 * mesmos três cards de segurança, palavra por palavra, nos dois arquivos. O
 * que difere é o bloco financeiro (cobrança no artista, recebimento no curador)
 * e o convite a ativar o papel de curador, que só existe no artista.
 *
 * Duplicá-la daria duas versões do fluxo mais sensível do produto — troca de
 * senha e exclusão de conta — e a chance de corrigir uma e esquecer a outra.
 */
export function TelaDeConta({
  ambiente,
  caminho,
  aba,
  email,
  papeis,
  sessoes,
  cadastroDoCurador = null,
  preferencias = null,
  cartaoSalvo = null,
  acaoDeRemoverCartao,
}: PropsTelaDeConta) {
  return (
    <div className={estilos.base}>
      <Abas abas={abasDe(ambiente)} ativa={aba} caminho={caminho} rotulo={CONTA.abasRotulo} />

      {aba === 'perfil' && cadastroDoCurador !== null ? (
        <PerfilDoCurador estado={cadastroDoCurador} />
      ) : null}

      {aba === 'dados' ? (
        <div className={estilos.blocos}>
          <CartaoDeCredencial
            tipo="email"
            overline={CONTA.emailTitulo}
            titulo={CONTA.emailTitulo}
            valor={email}
            nota={CONTA.emailNota}
            rotuloDaAcao={CONTA.alterarEmail}
            acao={trocarEmail}
          />

          <CartaoDeConta
            overline={CONTA.financeiroPendente[ambiente].titulo}
            titulo={CONTA.financeiroPendente[ambiente].titulo}
            nota={CONTA.financeiroPendente[ambiente].texto}
          >
            <Aviso estatico>{CONTA.pendenteNestaRelease}</Aviso>
          </CartaoDeConta>

          {/* O cartão guardado é do artista: o bloco do curador é de
              recebimento, e não tem cartão. Aparece mesmo vazio — é onde a
              pessoa procura, e o vazio explica quando um cartão aparece. */}
          {ambiente === 'artista' && acaoDeRemoverCartao !== undefined ? (
            <CartaoSalvoNaConta cartao={cartaoSalvo} acaoDeRemover={acaoDeRemoverCartao} />
          ) : null}

          {/* O convite só aparece para quem ainda não é curador — e só no
              ambiente do artista, que é onde o protótipo o desenha. */}
          {ambiente === 'artista' && !papeis.includes(Papel.CURADOR) ? (
            <CartaoDeConta
              variante="destaque"
              overline={CONTA.papeis.overline}
              titulo={CONTA.papeis.titulo}
              nota={CONTA.papeis.texto}
              acao={
                <BotaoLink href={ROTA.CURADOR_CADASTRO} tamanho="sm">
                  {CONTA.papeis.acao}
                </BotaoLink>
              }
            />
          ) : null}
        </div>
      ) : null}

      {aba === 'preferencias' ? (
        <div className={estilos.blocos}>
          <PainelDePreferencias
            ambiente={ambiente}
            eventos={preferencias?.eventos ?? []}
            idioma={preferencias?.idioma ?? 'pt-BR'}
            acaoDeCanal={alternarCanalDeEvento}
            acaoDeIdioma={definirIdiomaDaConta}
          />
        </div>
      ) : null}

      {aba === 'seguranca' ? (
        <div className={estilos.blocos}>
          <CartaoDeCredencial
            tipo="senha"
            overline={CONTA.senhaTitulo}
            titulo={CONTA.alterarSenha}
            nota={CONTA.senhaNota}
            rotuloDaAcao={CONTA.alterarSenha}
            acao={trocarSenha}
          />

          <PainelDeSessoes sessoes={sessoes} acaoDeEncerrar={encerrarSessaoDeOutroDispositivo} />

          <CartaoDeExclusao
            acaoDeExportar={exportarDadosDaConta}
            acaoDeExcluir={excluirMinhaConta}
          />
        </div>
      ) : null}
    </div>
  );
}
