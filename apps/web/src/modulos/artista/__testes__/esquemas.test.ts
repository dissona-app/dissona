import { describe, expect, it } from 'vitest';

import { CURADOR_CADASTRO, GENEROS_DO_ARTISTA } from '@dissona/nucleo/textos/prototipo';

import { esquemaDadosDoPerfil } from '../esquemas';
import { MAXIMO_DA_BIO, MAXIMO_DE_GENEROS } from '../tipos';

/**
 * O schema do perfil (7.1) espelha os `check` das migrations `0001` e `0002`.
 * Estes testes são o que garante que o espelho não se solta: se o teto da bio
 * mudar no banco e não aqui, a tela passa a aceitar o que o banco recusa.
 */

const VAZIO = {
  nomeExibicao: '',
  cidade: '',
  handle: '',
  bio: '',
  generos: [],
  linkInstagram: '',
  linkSpotify: '',
  linkYoutube: '',
  linkSite: '',
};

/** O primeiro motivo de um campo, que é o que a View pinta. */
function motivoDe(entrada: unknown, campo: string): string | undefined {
  const analise = esquemaDadosDoPerfil.safeParse(entrada);
  if (analise.success) return undefined;
  return analise.error.issues.find((issue) => issue.path[0] === campo)?.message;
}

describe('esquemaDadosDoPerfil', () => {
  it('aceita o perfil inteiro em branco — nenhum campo de 7.1 é obrigatório', () => {
    const analise = esquemaDadosDoPerfil.safeParse(VAZIO);
    expect(analise.success).toBe(true);
  });

  it('converte texto vazio em null, e não em string vazia', () => {
    const analise = esquemaDadosDoPerfil.safeParse(VAZIO);
    if (!analise.success) throw new Error('esperado sucesso');

    // `null` é o que a coluna anulável guarda. Gravar '' faria
    // `cidade is not null` mentir para quem consultar depois.
    expect(analise.data.cidade).toBeNull();
    expect(analise.data.bio).toBeNull();
    expect(analise.data.handle).toBeNull();
    expect(analise.data.linkSite).toBeNull();
  });

  describe('bio', () => {
    it(`aceita exatamente ${MAXIMO_DA_BIO} caracteres`, () => {
      const analise = esquemaDadosDoPerfil.safeParse({ ...VAZIO, bio: 'a'.repeat(MAXIMO_DA_BIO) });
      expect(analise.success).toBe(true);
    });

    it('recusa um caractere além do teto', () => {
      expect(motivoDe({ ...VAZIO, bio: 'a'.repeat(MAXIMO_DA_BIO + 1) }, 'bio')).toBe('bio_longa');
    });
  });

  describe('generos', () => {
    it(`aceita ${MAXIMO_DE_GENEROS} gêneros`, () => {
      const analise = esquemaDadosDoPerfil.safeParse({
        ...VAZIO,
        generos: ['Trap', 'Funk', 'Indie'],
      });
      expect(analise.success).toBe(true);
    });

    it('recusa o quarto gênero — é o check `array_length <= 3` da 0002', () => {
      expect(motivoDe({ ...VAZIO, generos: ['Trap', 'Funk', 'Indie', 'Samba'] }, 'generos')).toBe(
        'generos_demais',
      );
    });

    it('recusa gênero fora do catálogo com o motivo que a tela traduz', () => {
      // `toBeDefined()` escondia o bug: a mensagem estava no `z.array` e o que
      // chegava era a padrão do Zod, que `MOTIVOS` não conhece — erro que a
      // View não pinta em lugar nenhum.
      expect(motivoDe({ ...VAZIO, generos: ['Forró'] }, 'generos')).toBe('genero_desconhecido');
    });

    it('usa o mesmo catálogo do curador — o matching da R3 depende disso', () => {
      expect([...GENEROS_DO_ARTISTA]).toEqual([...CURADOR_CADASTRO.generos]);
      expect(motivoDe({ ...VAZIO, generos: ['Pagode'] }, 'generos')).toBeUndefined();
    });
  });

  describe('handle', () => {
    it('normaliza para minúsculas', () => {
      const analise = esquemaDadosDoPerfil.safeParse({ ...VAZIO, handle: 'Aurora_M' });
      if (!analise.success) throw new Error('esperado sucesso');
      expect(analise.data.handle).toBe('aurora_m');
    });

    it.each(['ab', 'a'.repeat(31), 'com-hifen', 'com ponto.', 'acentuação'])(
      'recusa %j pelo formato da 0001',
      (handle) => {
        expect(motivoDe({ ...VAZIO, handle }, 'handle')).toBe('handle_formato');
      },
    );
  });

  describe('links', () => {
    it('normaliza para https quando vem sem esquema', () => {
      const analise = esquemaDadosDoPerfil.safeParse({
        ...VAZIO,
        linkSpotify: 'open.spotify.com/artist/x',
      });
      if (!analise.success) throw new Error('esperado sucesso');
      expect(analise.data.linkSpotify).toBe('https://open.spotify.com/artist/x');
    });

    it('preserva o esquema que já veio', () => {
      const analise = esquemaDadosDoPerfil.safeParse({
        ...VAZIO,
        linkSite: 'http://exemplo.com',
      });
      if (!analise.success) throw new Error('esperado sucesso');
      expect(analise.data.linkSite).toBe('http://exemplo.com');
    });

    it('recusa link com espaço', () => {
      expect(motivoDe({ ...VAZIO, linkInstagram: 'insta gram.com/x' }, 'linkInstagram')).toBe(
        'link_com_espaco',
      );
    });

    it('recusa texto que não é endereço', () => {
      expect(motivoDe({ ...VAZIO, linkYoutube: 'meu canal' }, 'linkYoutube')).toBeDefined();
    });
  });
});
