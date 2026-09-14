/**
 * Regra das preferências (7.3 / 17.3).
 *
 * **Puro**, como o serviço de `pacote`: sem `server-only`, sem Supabase e sem
 * importar o repositório. Quem orquestra — ler a criticidade, conferir a
 * sessão, gravar — é `acoes.ts`. É o que torna estas regras testáveis sem
 * banco, e o que evita o ciclo que apareceria se o serviço chamasse o
 * repositório enquanto o repositório precisa da regra de sobreposição.
 */

import { CodigoErro, falhar } from '@/lib/erros';

import type { EscolhaDeEvento, EventoDoCatalogo, PreferenciaDeEvento } from './tipos';

/**
 * Sobrepõe as escolhas do usuário ao catálogo.
 *
 * Duas regras moram aqui:
 *
 * 1. **A ausência de linha é o padrão**, não "desligado". `preferencia_
 *    notificacao` só guarda o que difere, então um evento sem linha vale
 *    ligado — e tratá-lo como desligado silenciaria todo aviso de quem nunca
 *    abriu esta tela, sem ninguém reclamar.
 * 2. **Um canal que o evento não tem nunca liga**, nem com linha mandando.
 *    `canais_padrao` é quem diz quais canais existem para aquele evento; uma
 *    linha antiga pedindo e-mail num evento que virou só in-app não pode
 *    ressuscitar o canal.
 */
export function aplicarEscolhas(
  catalogo: readonly EventoDoCatalogo[],
  escolhas: readonly EscolhaDeEvento[],
): readonly PreferenciaDeEvento[] {
  const porEvento = new Map(escolhas.map((escolha) => [escolha.evento, escolha] as const));

  return catalogo.map((evento) => {
    const temInApp = evento.canaisPadrao.includes('in_app');
    const temEmail = evento.canaisPadrao.includes('email');
    const escolha = porEvento.get(evento.chave);

    return {
      evento: evento.chave,
      titulo: evento.titulo,
      critico: evento.critico,
      inApp: temInApp && (escolha?.inApp ?? true),
      email: temEmail && (escolha?.email ?? true),
      temInApp,
      temEmail,
    };
  });
}

/**
 * **Evento crítico não se desliga.**
 *
 * A matriz de notificações declara a regra, e `registrar_notificacao` a aplica
 * no envio — ela ignora a preferência quando `critico`. Sem esta guarda a tela
 * gravaria uma escolha que o sistema nunca honraria, que é o pior dos dois
 * mundos: a pessoa acreditaria ter desligado.
 *
 * Só desligar é barrado. Religar um crítico é inócuo — ele já era enviado —, e
 * recusar obrigaria a tela a distinguir dois "não pode" diferentes.
 */
export function exigirQuePossaAlternar(critico: boolean | null, ligado: boolean): void {
  if (critico === null) falhar(CodigoErro.NAO_ENCONTRADO);
  if (!ligado && critico) falhar(CodigoErro.NAO_AUTORIZADO, { motivo: 'evento_critico' });
}
