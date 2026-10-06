import 'server-only';

/**
 * `servicoNotificacao` — a porta que os outros módulos usam.
 *
 * ## Por que ele engole a falha
 *
 * Toda função aqui **não lança**. Isso é deliberado, e é a decisão mais
 * importante do arquivo.
 *
 * O caso que a motiva: RF-009 manda gravar um alerta para o admin quando
 * alguém conclui o cadastro. Se essa gravação falhar — a service role não está
 * configurada, o banco piscou, o catálogo mudou —, o que **não** pode acontecer
 * é o cadastro da pessoa falhar. Ela preencheu o formulário, a conta foi criada
 * no Auth, o perfil nasceu por trigger; deixar tudo isso de pé e devolver um
 * erro genérico porque um aviso interno não foi gravado troca um problema
 * nosso por um problema dela.
 *
 * O mesmo vale para o aviso de troca de senha e para o de convite: o efeito
 * principal já aconteceu e é irreversível quando a notificação entra em cena.
 *
 * A falha vai para `console.error`, que é o log da função na Vercel. O gate
 * "todo evento da R1 grava em `notificacao`" do BACKLOG é verificado por E2E e
 * por consulta ao banco, não pela ausência de exceção aqui.
 *
 * As notificações **transacionais** — as que não podem se perder — não passam
 * por este arquivo: `bronze_aprovado`, `cadastro_em_analise` e
 * `curador_prata_em_analise` são emitidas de dentro de
 * `concluir_cadastro_curador` (0002c), na mesma transação da classificação.
 * Ali, ou tudo grava, ou nada grava.
 */

import { temChaveDeServico } from '@/lib/ambiente';

import { lerPerfisDaEquipeAdmin, registrarNotificacao } from './repositorio';
import type { ContextoNotificacao, EventoNotificacao } from './tipos';

function relatar(evento: string, erro: unknown): void {
  console.error(`[notificacao] falhou ao gravar "${evento}":`, erro);
}

/**
 * Sem a chave de serviço não há como gravar, e dizer isso uma vez por chamada é
 * mais útil que um erro de rede repetido — em desenvolvimento, é o aviso que
 * explica por que a central de notificações está vazia.
 */
function semChave(evento: string): boolean {
  if (temChaveDeServico()) return false;
  console.warn(
    `[notificacao] "${evento}" não foi gravada: SUPABASE_SERVICE_ROLE_KEY não está definida. ` +
      'Ver README.md → Começando.',
  );
  return true;
}

/** Notifica uma pessoa. */
export async function notificar(
  perfilId: string,
  evento: EventoNotificacao,
  contexto?: ContextoNotificacao,
  rota?: string,
): Promise<void> {
  if (semChave(evento)) return;

  try {
    await registrarNotificacao({
      perfilId,
      evento,
      ...(contexto === undefined ? {} : { contexto }),
      ...(rota === undefined ? {} : { rota }),
    });
  } catch (erro) {
    relatar(evento, erro);
  }
}

/**
 * Notifica toda a equipe administrativa ativa.
 *
 * Uma linha por membro — não existe caixa coletiva. `Promise.allSettled` em vez
 * de `all`: um membro com preferência quebrada não deve impedir o aviso dos
 * outros.
 */
export async function notificarEquipeAdmin(
  evento: EventoNotificacao,
  contexto?: ContextoNotificacao,
  rota?: string,
): Promise<void> {
  if (semChave(evento)) return;

  try {
    const perfis = await lerPerfisDaEquipeAdmin();

    const resultados = await Promise.allSettled(
      perfis.map((perfilId) =>
        registrarNotificacao({
          perfilId,
          evento,
          ...(contexto === undefined ? {} : { contexto }),
          ...(rota === undefined ? {} : { rota }),
        }),
      ),
    );

    for (const resultado of resultados) {
      if (resultado.status === 'rejected') relatar(evento, resultado.reason);
    }
  } catch (erro) {
    relatar(evento, erro);
  }
}
