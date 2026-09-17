import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Arquivos de áudio de tamanho arbitrário, sem binário no repositório.
 *
 * O repositório versiona **um** mp3, de 16 KB (`e2e/apoio/arquivos/`), e é ele
 * que serve a quase toda a suíte. Mas o RF-036 fala de 50 MB, e commitar
 * cinquenta megabytes para provar que eles são recusados seria pagar o custo em
 * todo `git clone`, para sempre.
 *
 * A saída é gerar na hora, em `test-results/tmp/`, que já está fora do controle
 * de versão. O arquivo começa com os bytes do mp3 real — para o navegador
 * detectar `audio/mpeg` no `type` do `File`, que é o que `validarAudio` lê — e
 * o resto é preenchimento. Não é um mp3 tocável, e não precisa ser: quem o
 * recusa o faz pelo tamanho, antes de qualquer decodificação.
 */

export const FAIXA_MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');

const TEMPORARIOS = join(process.cwd(), 'test-results', 'tmp');

/**
 * Um `.mp3` com exatamente `megabytes` de tamanho, reaproveitado entre execuções.
 *
 * O cache por tamanho importa: gerar 51 MB custa segundos, e os cenários de
 * limite rodam mais de uma vez. `statSync` confere o tamanho em vez de confiar
 * no nome, porque uma geração interrompida deixaria um arquivo curto com o nome
 * certo — e aí o teste do limite passaria por engano.
 */
export function mp3DeTamanho(megabytes: number): string {
  mkdirSync(TEMPORARIOS, { recursive: true });

  const bytes = Math.round(megabytes * 1024 * 1024);
  const caminho = join(TEMPORARIOS, `e2e-faixa-${megabytes}mb.mp3`);

  if (existsSync(caminho) && statSync(caminho).size === bytes) return caminho;

  // O cabeçalho do mp3 real, para o `type` do `File` sair `audio/mpeg`.
  const cabecalho = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const conteudo = Buffer.alloc(bytes);
  cabecalho.copy(conteudo, 0);

  writeFileSync(caminho, conteudo);
  return caminho;
}
