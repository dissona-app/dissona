/**
 * Regra do envio (módulo 3).
 *
 * **Puro** — sem `server-only`, sem Supabase, sem importar o repositório.
 * Quem orquestra é `acoes.ts`.
 */

import type { FaixaEmEdicao, LimitesDeUpload, PassoDoEnvio } from './tipos';

/** MIME aceitos por extensão configurada. O navegador varia o rótulo do wav. */
const MIME_POR_FORMATO: Readonly<Record<string, readonly string[]>> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
};

export type FalhaDoArquivo = 'ausente' | 'formato' | 'tamanho';

/**
 * Valida o arquivo de áudio contra `configuracao`.
 *
 * Roda **no servidor**, sempre. O `accept` do `<input>` é conveniência: ele
 * filtra o seletor de arquivos e nada mais — arrastar outro arquivo, ou um
 * POST montado à mão, passa por ele sem obstáculo.
 *
 * O tipo é conferido pelo MIME e não pela extensão do nome: o nome vem do
 * cliente e renomear `.exe` para `.mp3` é trivial.
 */
export function validarAudio(
  arquivo: File | null,
  limites: LimitesDeUpload,
): FalhaDoArquivo | null {
  if (arquivo === null || arquivo.size === 0) return 'ausente';

  const aceitos = limites.formatos.flatMap((formato) => MIME_POR_FORMATO[formato] ?? []);
  if (!aceitos.includes(arquivo.type)) return 'formato';

  if (arquivo.size > limites.tamanhoMaxMb * 1024 * 1024) return 'tamanho';

  return null;
}

/**
 * Até onde a faixa já chegou no wizard.
 *
 * Derivado dos campos, e não de uma coluna de progresso: cada passo tem campo
 * obrigatório próprio, então a presença dele **é** a conclusão do passo. Quem
 * abre `/revisao` sem contexto é devolvido para `/contexto`.
 */
export function passoAlcancado(faixa: FaixaEmEdicao): PassoDoEnvio {
  if (faixa.arquivoCaminho === null || faixa.titulo.trim() === '') return 'faixa';
  if (faixa.genero === null || (faixa.contextoCurador ?? '').trim() === '') return 'contexto';
  return 'revisao';
}

/** O passo pedido é alcançável? Adiantar-se no wizard não pode. */
export function podeAbrir(faixa: FaixaEmEdicao, passo: PassoDoEnvio): boolean {
  const ordem: readonly PassoDoEnvio[] = ['faixa', 'contexto', 'revisao'];
  return ordem.indexOf(passo) <= ordem.indexOf(passoAlcancado(faixa));
}

/**
 * Rótulo da fonte, para a revisão (passo 3).
 *
 * Três formas no protótipo — arquivo, link detectado e preenchido à mão. Com a
 * decisão de **sempre** exigir o arquivo, "link" passa a significar "o link
 * trouxe os metadados", e não "a faixa toca do streaming".
 */
export function rotuloDaFonte(faixa: FaixaEmEdicao): 'arquivo' | 'link' | 'manual' {
  if (faixa.origem === 'link') return 'link';
  return faixa.arquivoCaminho !== null ? 'arquivo' : 'manual';
}
