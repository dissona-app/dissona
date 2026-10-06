import { describe, expect, it } from 'vitest';

import { executar, falha, falhaDeCampos, sucesso } from '../acoes';
import { CodigoErro, ErroDominio } from '../erros';
import { erroGeralDe, ERRO_GERAL, mensagemDaFalha } from '@/textos/erros';

/**
 * O contrato que a recusa silenciosa quebrou.
 *
 * `falha()` grava `campo` (singular) e `falhaDeCampos()` grava `campos`
 * (plural). Doze telas liam só `campos`, e toda `falha()` que chegava a elas
 * sumia — botão clicado, nada na tela. Os testes abaixo fixam qual chave cada
 * construtor popula, para que uma troca de nome apareça aqui e não em produção.
 */
describe('contrato de falha', () => {
  it('falha() popula campo e nunca campos', () => {
    const resultado = falha(CodigoErro.SENHA_FRACA, 'senha');

    expect(resultado).toEqual({ ok: false, codigo: CodigoErro.SENHA_FRACA, campo: 'senha' });
    expect(resultado.campos).toBeUndefined();
  });

  it('falha() sem campo não inventa chave nenhuma', () => {
    const resultado = falha(CodigoErro.PAPEL_AUSENTE);

    expect(resultado.campo).toBeUndefined();
    expect(resultado.campos).toBeUndefined();
  });

  it('falhaDeCampos() popula campos e nunca campo', () => {
    const resultado = falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, { senha: 'senha_fraca' });

    expect(resultado.campos).toEqual({ senha: 'senha_fraca' });
    expect(resultado.campo).toBeUndefined();
  });

  it('executar() converte ErroDominio em falha com o campo dos detalhes', async () => {
    const resultado = await executar(async () => {
      throw new ErroDominio(CodigoErro.ENTRADA_INVALIDA, { campo: 'valor' });
    });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.campo).toBe('valor');
    expect(resultado.campos).toBeUndefined();
  });

  it('executar() deixa passar o que não é erro de domínio', async () => {
    await expect(
      executar(async () => {
        throw new TypeError('fetch failed');
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it('sucesso() nunca tem código', () => {
    expect(sucesso()).toEqual({ ok: true, dados: undefined });
  });
});

/**
 * A trava da superfície geral: nenhuma falha pode sair sem texto, venha ela
 * por `campo`, por `campos` ou por código nenhum dos dois.
 */
describe('superfície de erro geral', () => {
  it('fala quando a tela não pintou campo nenhum', () => {
    expect(erroGeralDe(falha(CodigoErro.PAPEL_AUSENTE), [undefined, undefined])).toBe(
      mensagemDaFalha(falha(CodigoErro.PAPEL_AUSENTE)),
    );
  });

  it('fala também quando a falha tem campo que a tela não sabe ler', () => {
    // O caso do aceite de convite: `falha(SENHA_FRACA, 'senha')` numa tela que
    // só consulta `campos`. Ter `campo` não é ter mensagem.
    expect(erroGeralDe(falha(CodigoErro.SENHA_FRACA, 'senha'), [undefined])).toBeDefined();
  });

  it('cala quando algum campo já recebeu mensagem', () => {
    expect(
      erroGeralDe(falha(CodigoErro.ENTRADA_INVALIDA), [undefined, 'Senha fraca']),
    ).toBeUndefined();
  });

  it('cala quando a tela já trata aquele código num banner próprio', () => {
    expect(erroGeralDe(falha(CodigoErro.EMAIL_JA_CADASTRADO), [undefined], true)).toBeUndefined();
  });

  it('cala quando não houve falha', () => {
    expect(erroGeralDe(null, [undefined])).toBeUndefined();
  });

  it('código sem texto próprio cai no genérico', () => {
    expect(mensagemDaFalha(falha(CodigoErro.CURADOR_DUPLICADO))).toBe(ERRO_GERAL);
  });
});
