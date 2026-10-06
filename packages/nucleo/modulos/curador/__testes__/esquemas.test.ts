import { describe, expect, it } from 'vitest';

import {
  ANEXO_MAX_BYTES,
  ANEXO_TIPOS,
  FOTO_MAX_BYTES,
  FOTO_TIPOS,
  conferirObjeto,
  extensaoDoMime,
} from '../esquemas';

/**
 * As duas peças que o upload direto ao Storage acrescentou ao módulo 12.
 *
 * `extensaoDoMime` é chamada **nos dois lados**: o navegador a usa para nomear o
 * objeto, o servidor a usa para o `multipart`. Divergirem significa o servidor
 * procurar um objeto que não existe — por isso ela tem teste próprio.
 */
describe('extensaoDoMime', () => {
  it('mapeia os tipos que a aplicação aceita', () => {
    expect(extensaoDoMime('application/pdf')).toBe('.pdf');
    expect(extensaoDoMime('image/png')).toBe('.png');
    expect(extensaoDoMime('image/jpeg')).toBe('.jpg');
  });

  it('dá nome próprio ao webp, que o bucket aceita e a aplicação não', () => {
    // `avatares` aceita `image/webp`; `FOTO_TIPOS` não. Se o webp virasse
    // `.jpg`, um upload que a aplicação vai recusar sobrescreveria a foto boa.
    expect(FOTO_TIPOS).not.toContain('image/webp');
    expect(extensaoDoMime('image/webp')).toBe('.webp');
    expect(extensaoDoMime('image/webp')).not.toBe(extensaoDoMime('image/jpeg'));
  });
});

describe('conferirObjeto', () => {
  const objeto = (tamanhoBytes: number, mime: string) => ({ tamanhoBytes, mime });

  it('aceita o anexo dentro do tipo e do tamanho', () => {
    expect(conferirObjeto(objeto(1024, 'application/pdf'), ANEXO_TIPOS, ANEXO_MAX_BYTES)).toEqual({
      ok: true,
    });
  });

  it('recusa por tipo o que o bucket aceitaria e a aplicação não', () => {
    // `materiais` aceita `.docx`; o passo 6 não. É o caso que só esta
    // conferência pega — o bucket deixaria passar.
    expect(
      conferirObjeto(
        objeto(1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ANEXO_TIPOS,
        ANEXO_MAX_BYTES,
      ),
    ).toEqual({ ok: false, motivo: 'tipo' });
  });

  it('recusa por tamanho o que o bucket aceitaria e a aplicação não', () => {
    // O bucket `materiais` permite 20 MB; a aplicação, 5.
    expect(
      conferirObjeto(objeto(6 * 1024 * 1024, 'application/pdf'), ANEXO_TIPOS, ANEXO_MAX_BYTES),
    ).toEqual({ ok: false, motivo: 'tamanho' });
  });

  it('trata objeto inexistente e objeto vazio como ausente', () => {
    // `null` cobre dois casos indistinguíveis por desenho: não existe, ou é de
    // outra pessoa e a RLS o esconde.
    expect(conferirObjeto(null, FOTO_TIPOS, FOTO_MAX_BYTES)).toEqual({
      ok: false,
      motivo: 'ausente',
    });
    expect(conferirObjeto(objeto(0, 'image/png'), FOTO_TIPOS, FOTO_MAX_BYTES)).toEqual({
      ok: false,
      motivo: 'ausente',
    });
  });

  it('confere o tipo antes do tamanho, como `conferirArquivo`', () => {
    expect(
      conferirObjeto(objeto(9 * 1024 * 1024, 'text/csv'), ANEXO_TIPOS, ANEXO_MAX_BYTES),
    ).toEqual({ ok: false, motivo: 'tipo' });
  });
});
