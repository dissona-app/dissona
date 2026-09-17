import { describe, expect, it } from 'vitest';

import { caminhoEhDoUsuario } from '../armazenamento';

/**
 * A tranca do upload direto.
 *
 * Desde que o navegador sobe o arquivo e a Server Action recebe só um caminho,
 * esta função é o que impede o formulário de escolher em qual pasta do Storage
 * a aplicação vai acreditar — e o valor que ela aprova vai para colunas lidas
 * depois (`faixa.arquivo_caminho`, `perfil.foto_caminho`,
 * `credencial_curador.anexo_caminho`). É conferência de dono; merece teste.
 */
const DONO = '11111111-1111-1111-1111-111111111111';
const OUTRO = '22222222-2222-2222-2222-222222222222';

describe('caminhoEhDoUsuario', () => {
  it('aceita o arquivo na raiz da pasta da pessoa', () => {
    expect(caminhoEhDoUsuario(`${DONO}/formacao.pdf`, DONO)).toBe(true);
    expect(caminhoEhDoUsuario(`${DONO}/perfil.jpg`, DONO)).toBe(true);
  });

  it('recusa a pasta de outra pessoa', () => {
    expect(caminhoEhDoUsuario(`${OUTRO}/formacao.pdf`, DONO)).toBe(false);
  });

  it('recusa subpasta — é caminho que nenhum código nosso monta', () => {
    expect(caminhoEhDoUsuario(`${DONO}/sub/formacao.pdf`, DONO)).toBe(false);
  });

  it('recusa prefixo parecido, que é como a checagem ingênua falha', () => {
    // Sem a barra no prefixo, `startsWith` aceitaria isto.
    expect(caminhoEhDoUsuario(`${DONO}extra/formacao.pdf`, DONO)).toBe(false);
  });

  it('recusa caminho sem pasta e caminho vazio', () => {
    expect(caminhoEhDoUsuario('formacao.pdf', DONO)).toBe(false);
    expect(caminhoEhDoUsuario('', DONO)).toBe(false);
  });

  it('recusa travessia para fora da pasta', () => {
    expect(caminhoEhDoUsuario(`${DONO}/../${OUTRO}/x.pdf`, DONO)).toBe(false);
  });
});
