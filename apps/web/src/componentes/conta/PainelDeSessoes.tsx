'use client';

import { useFormStatus } from 'react-dom';

import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { tempoRelativo } from '@dissona/nucleo/lib/formato';
import { lerDispositivo } from '@/modulos/conta/agente';
import type { SessaoAtiva } from '@/modulos/conta/consultas';
import { CONTA } from '@dissona/nucleo/textos/prototipo';

import estilos from './PainelDeSessoes.module.css';

export type PropsPainelDeSessoes = {
  readonly sessoes: readonly SessaoAtiva[];
  readonly acaoDeEncerrar: (dados: FormData) => Promise<void>;
  readonly acaoDeEncerrarOutras: () => Promise<void>;
};

/**
 * Quantas linhas o painel mostra. A lista inteira podia passar de mil — cada
 * login abre uma sessão, e elas só expiram com o refresh token —, e um painel
 * que serve para reconhecer acesso indevido precisa caber na tela. O resto
 * vira contagem, com o atalho de encerrar todas.
 */
const LIMITE_DE_LINHAS = 5;

/** A atual primeiro; depois, da vista mais recentemente para a mais antiga. */
function ordenar(sessoes: readonly SessaoAtiva[]): readonly SessaoAtiva[] {
  return [...sessoes].sort((a, b) => {
    if (a.atual !== b.atual) return a.atual ? -1 : 1;
    return b.vistoEm.localeCompare(a.vistoEm);
  });
}

/**
 * "Sessões ativas" (7.4 / 17.4 / 27.1).
 *
 * ## Por que a sessão atual não tem "Encerrar"
 *
 * Encerrar a própria sessão daqui é "Sair", e "Sair" já está no menu do
 * header. Um botão que derruba a sessão de onde a pessoa está olhando, ao lado
 * de outros que derrubam as dos outros dispositivos, é um clique errado
 * esperando acontecer — e a RPC `encerrar_sessao_da_conta` recusa a atual de
 * qualquer forma. A recusa é a garantia; a ausência do botão é a cortesia.
 *
 * ## Por que a hora é formatada no cliente
 *
 * "há 3 dias" depende do relógio de **quem lê**, não do servidor. Formatar no
 * servidor congelaria o texto no momento do render, e uma página aberta por
 * uma hora mostraria "agora" para uma sessão que já não é.
 */
export function PainelDeSessoes({
  sessoes,
  acaoDeEncerrar,
  acaoDeEncerrarOutras,
}: PropsPainelDeSessoes) {
  const visiveis = ordenar(sessoes).slice(0, LIMITE_DE_LINHAS);
  const ocultas = sessoes.length - visiveis.length;
  const outras = sessoes.filter((sessao) => !sessao.atual).length;

  return (
    <div className={estilos.base}>
      <span className={estilos.overline}>{CONTA.sessoesTitulo}</span>

      {sessoes.length === 0 ? (
        <p className={estilos.vazio}>{CONTA.sessoesVazias}</p>
      ) : (
        <ul className={estilos.lista}>
          {visiveis.map((sessao) => (
            <li key={sessao.id} className={estilos.linha}>
              <div className={estilos.textos}>
                <span className={estilos.dispositivo}>{rotuloDoDispositivo(sessao)}</span>
                <span className={estilos.apoio}>{rotuloDeApoio(sessao)}</span>
              </div>

              {sessao.atual ? (
                <Etiqueta tom="sucesso">{CONTA.sessaoAtual}</Etiqueta>
              ) : (
                <form action={acaoDeEncerrar}>
                  <input type="hidden" name="sessaoId" value={sessao.id} />
                  <BotaoDeEncerrar />
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {ocultas > 0 ? <p className={estilos.ocultas}>{CONTA.sessoesOcultas(ocultas)}</p> : null}

      {outras > 1 ? (
        <form action={acaoDeEncerrarOutras} className={estilos.encerrarOutras}>
          <BotaoDeEncerrarOutras />
        </form>
      ) : null}
    </div>
  );
}

function BotaoDeEncerrarOutras() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={estilos.encerrar} disabled={pending}>
      {pending ? CONTA.encerrandoOutrasSessoes : CONTA.encerrarOutrasSessoes}
    </button>
  );
}

/**
 * Separado para poder usar `useFormStatus`, que só lê o `<form>` **acima** de
 * si — dentro do componente que renderiza o formulário, ele leria sempre
 * `false`.
 */
function BotaoDeEncerrar() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={estilos.encerrar} disabled={pending}>
      {pending ? CONTA.encerrandoSessao : CONTA.encerrarSessao}
    </button>
  );
}

function rotuloDoDispositivo(sessao: SessaoAtiva): string {
  const { navegador, sistema } = lerDispositivo(sessao.agente);
  if (navegador === null && sistema === null) return CONTA.sessaoDispositivoDesconhecido;
  if (navegador === null) return sistema ?? CONTA.sessaoDispositivoDesconhecido;
  if (sistema === null) return navegador;
  return CONTA.sessaoDispositivo(navegador, sistema);
}

/**
 * Linha de apoio: "Este dispositivo · agora" na atual, e último acesso mais IP
 * nas outras. O IP entra só nas outras porque é ali que ele serve — na sessão
 * em que a pessoa está, ele não diz nada que ela não saiba.
 */
function rotuloDeApoio(sessao: SessaoAtiva): string {
  if (sessao.atual) return CONTA.sessaoEsteDispositivo;

  const visto = CONTA.sessaoVistoEm(tempoRelativo(new Date(sessao.vistoEm)));
  return sessao.ip === null ? visto : `${visto} · ${CONTA.sessaoIp(sessao.ip)}`;
}
