import { Abas } from '@/componentes/base/Abas';
import { Aviso } from '@/componentes/base/Aviso';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { ROTA } from '@/lib/guarda-rota';
import { Papel } from '@/lib/papeis';
import {
  encerrarSessaoDeOutroDispositivo,
  excluirMinhaConta,
  exportarDadosDaConta,
  trocarEmail,
  trocarSenha,
} from '@/modulos/conta/acoes';
import type { SessaoAtiva } from '@/modulos/conta/consultas';
import { CONTA } from '@/textos/prototipo';

import { CartaoDeConta } from './CartaoDeConta';
import { CartaoDeCredencial } from './CartaoDeCredencial';
import { CartaoDeExclusao } from './CartaoDeExclusao';
import { PainelDeSessoes } from './PainelDeSessoes';
import estilos from './TelaDeConta.module.css';

/** A aba aberta. Valor fora desta lista cai em `dados`. */
const ABAS = [
  { chave: 'dados', rotulo: CONTA.abas.dados },
  { chave: 'preferencias', rotulo: CONTA.abas.preferencias },
  { chave: 'seguranca', rotulo: CONTA.abas.seguranca },
] as const;

export type AbaDeConta = (typeof ABAS)[number]['chave'];

export function ehAbaDeConta(valor: string | undefined): valor is AbaDeConta {
  return ABAS.some((aba) => aba.chave === valor);
}

export type PropsTelaDeConta = {
  /** Decide o bloco financeiro e se o convite ao papel de curador aparece. */
  readonly ambiente: Extract<Papel, 'artista' | 'curador'>;
  /** Caminho da própria tela — as abas são links para ele. */
  readonly caminho: string;
  readonly aba: AbaDeConta;
  readonly email: string;
  readonly papeis: readonly Papel[];
  readonly sessoes: readonly SessaoAtiva[];
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
export function TelaDeConta({ ambiente, caminho, aba, email, papeis, sessoes }: PropsTelaDeConta) {
  return (
    <div className={estilos.base}>
      <Abas abas={ABAS} ativa={aba} caminho={caminho} rotulo={CONTA.abasRotulo} />

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

          {/* O convite só aparece para quem ainda não é curador — e só no
              ambiente do artista, que é onde o protótipo o desenha. */}
          {ambiente === 'artista' && !papeis.includes(Papel.CURADOR) ? (
            <CartaoDeConta
              variante="destaque"
              overline={CONTA.papeis.overline}
              titulo={CONTA.papeis.titulo}
              nota={CONTA.papeis.texto}
              acao={
                <BotaoLink href={ROTA.CURADOR_CADASTRO} tamanho="denso">
                  {CONTA.papeis.acao}
                </BotaoLink>
              }
            />
          ) : null}
        </div>
      ) : null}

      {aba === 'preferencias' ? (
        <div className={estilos.blocos}>
          <CartaoDeConta
            overline={CONTA.abas.preferencias}
            titulo={CONTA.preferenciasPendente.titulo}
            nota={CONTA.preferenciasPendente.texto}
          >
            <Aviso estatico>{CONTA.pendenteNestaRelease}</Aviso>
          </CartaoDeConta>
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
