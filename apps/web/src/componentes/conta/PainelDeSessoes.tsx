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

/**
 * Uma linha do painel: as sessões do mesmo dispositivo e IP juntas. Para quem
 * lê, cinco logins no mesmo notebook são um aparelho, não cinco; e encerrar
 * esse aparelho é encerrar as cinco.
 */
type Grupo = {
  readonly chave: string;
  readonly ids: readonly string[];
  readonly atual: boolean;
  readonly dispositivo: string;
  readonly ip: string | null;
  readonly vistoEm: string;
};

function agrupar(sessoes: readonly SessaoAtiva[]): readonly Grupo[] {
  const grupos = new Map<string, Grupo>();

  for (const sessao of sessoes) {
    const dispositivo = rotuloDoDispositivo(sessao);
    // A atual fica sozinha: ela não se encerra por aqui, e misturá-la num grupo
    // daria ao "Encerrar" um id que a RPC recusaria.
    const chave = sessao.atual ? 'atual' : `${dispositivo}|${sessao.ip ?? ''}`;
    const existente = grupos.get(chave);

    grupos.set(
      chave,
      existente === undefined
        ? {
            chave,
            ids: [sessao.id],
            atual: sessao.atual,
            dispositivo,
            ip: sessao.ip,
            vistoEm: sessao.vistoEm,
          }
        : {
            ...existente,
            ids: [...existente.ids, sessao.id],
            vistoEm: sessao.vistoEm > existente.vistoEm ? sessao.vistoEm : existente.vistoEm,
          },
    );
  }

  // A atual primeiro; depois, do grupo visto mais recentemente ao mais antigo.
  return [...grupos.values()].sort((a, b) => {
    if (a.atual !== b.atual) return a.atual ? -1 : 1;
    return b.vistoEm.localeCompare(a.vistoEm);
  });
}

export function PainelDeSessoes({
  sessoes,
  acaoDeEncerrar,
  acaoDeEncerrarOutras,
}: PropsPainelDeSessoes) {
  const grupos = agrupar(sessoes);
  const visiveis = grupos.slice(0, LIMITE_DE_LINHAS);
  const ocultas = grupos.length - visiveis.length;
  const outras = sessoes.filter((sessao) => !sessao.atual).length;

  return (
    <div className={estilos.base}>
      <span className={estilos.overline}>{CONTA.sessoesTitulo}</span>

      {sessoes.length === 0 ? (
        <p className={estilos.vazio}>{CONTA.sessoesVazias}</p>
      ) : (
        <ul className={estilos.lista}>
          {visiveis.map((grupo) => (
            <li key={grupo.chave} className={estilos.linha}>
              <div className={estilos.textos}>
                <span className={estilos.dispositivo}>{grupo.dispositivo}</span>
                <span className={estilos.apoio}>{rotuloDeApoio(grupo)}</span>
              </div>

              {grupo.atual ? (
                <Etiqueta tom="sucesso">{CONTA.sessaoAtual}</Etiqueta>
              ) : (
                <form action={acaoDeEncerrar}>
                  {grupo.ids.map((id) => (
                    <input key={id} type="hidden" name="sessaoId" value={id} />
                  ))}
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
function rotuloDeApoio(grupo: Grupo): string {
  if (grupo.atual) return CONTA.sessaoEsteDispositivo;

  const partes = [CONTA.sessaoVistoEm(tempoRelativo(new Date(grupo.vistoEm)))];
  if (grupo.ip !== null) partes.push(CONTA.sessaoIp(grupo.ip));
  if (grupo.ids.length > 1) partes.push(CONTA.sessoesNoGrupo(grupo.ids.length));
  return partes.join(' · ');
}
