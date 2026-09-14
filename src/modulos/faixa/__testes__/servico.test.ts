import { describe, expect, it } from 'vitest';

import { passoAlcancado, podeAbrir, rotuloDaFonte, validarAudio } from '../servico';
import type { FaixaEmEdicao, LimitesDeUpload } from '../tipos';

/**
 * Regra do envio (módulo 3).
 *
 * A validação do arquivo é a que mais importa: ela é a **única** barreira real
 * entre o que o artista manda e o bucket. O `accept` do `<input>` filtra o
 * seletor e nada mais.
 */

const LIMITES: LimitesDeUpload = { tamanhoMaxMb: 50, formatos: ['wav', 'mp3'] };

/** `File` de tamanho arbitrário sem alocar os bytes. */
function arquivo(tipo: string, megabytes: number): File {
  const f = new File(['x'], 'faixa', { type: tipo });
  Object.defineProperty(f, 'size', { value: Math.round(megabytes * 1024 * 1024) });
  return f;
}

const FAIXA: FaixaEmEdicao = {
  id: 'f1',
  titulo: 'Aurora',
  capaCaminho: null,
  estilo: null,
  genero: null,
  contextoCurador: null,
  lancada: null,
  dataLancamento: null,
  origem: 'arquivo',
  urlSpotify: null,
  urlYoutube: null,
  arquivoCaminho: 'uid/faixa.mp3',
  duracaoSegundos: 212,
  situacao: 'rascunho',
};

describe('validarAudio', () => {
  it('aceita mp3 e wav dentro do limite', () => {
    expect(validarAudio(arquivo('audio/mpeg', 10), LIMITES)).toBeNull();
    expect(validarAudio(arquivo('audio/wav', 49.9), LIMITES)).toBeNull();
  });

  it('aceita as variações de MIME que os navegadores dão ao wav', () => {
    // Chrome, Firefox e Safari não concordam no rótulo do wav. Aceitar só
    // `audio/wav` recusaria arquivo válido em metade dos navegadores.
    for (const tipo of ['audio/x-wav', 'audio/wave', 'audio/vnd.wave']) {
      expect(validarAudio(arquivo(tipo, 5), LIMITES), tipo).toBeNull();
    }
  });

  it('recusa arquivo ausente ou vazio', () => {
    expect(validarAudio(null, LIMITES)).toBe('ausente');
    expect(validarAudio(arquivo('audio/mpeg', 0), LIMITES)).toBe('ausente');
  });

  it('recusa formato fora da configuração', () => {
    expect(validarAudio(arquivo('audio/flac', 5), LIMITES)).toBe('formato');
    expect(validarAudio(arquivo('application/pdf', 1), LIMITES)).toBe('formato');
  });

  it('recusa pelo MIME, e não pela extensão do nome', () => {
    // Renomear `.exe` para `.mp3` é trivial; o nome vem do cliente.
    const disfarçado = new File(['x'], 'musica.mp3', { type: 'application/x-msdownload' });
    expect(validarAudio(disfarçado, LIMITES)).toBe('formato');
  });

  it('recusa acima do teto, e aceita exatamente no teto', () => {
    expect(validarAudio(arquivo('audio/mpeg', 50.1), LIMITES)).toBe('tamanho');
    expect(validarAudio(arquivo('audio/mpeg', 50), LIMITES)).toBeNull();
  });

  it('respeita o teto vindo da configuração, não um 50 embutido', () => {
    const apertado: LimitesDeUpload = { tamanhoMaxMb: 8, formatos: ['mp3'] };
    expect(validarAudio(arquivo('audio/mpeg', 10), apertado)).toBe('tamanho');
    expect(validarAudio(arquivo('audio/wav', 1), apertado)).toBe('formato');
  });
});

describe('passoAlcancado', () => {
  it('sem arquivo, fica no passo 1', () => {
    expect(passoAlcancado({ ...FAIXA, arquivoCaminho: null })).toBe('faixa');
  });

  it('sem título, fica no passo 1 mesmo com arquivo', () => {
    expect(passoAlcancado({ ...FAIXA, titulo: '   ' })).toBe('faixa');
  });

  it('com arquivo e título, chega ao contexto', () => {
    expect(passoAlcancado(FAIXA)).toBe('contexto');
  });

  it('contexto em branco não conta como preenchido', () => {
    expect(passoAlcancado({ ...FAIXA, genero: 'Indie', contextoCurador: '   ' })).toBe('contexto');
  });

  it('com gênero e contexto, chega à revisão', () => {
    expect(passoAlcancado({ ...FAIXA, genero: 'Indie', contextoCurador: 'Ouça o refrão.' })).toBe(
      'revisao',
    );
  });
});

describe('podeAbrir', () => {
  it('não deixa pular para a revisão sem contexto', () => {
    expect(podeAbrir(FAIXA, 'revisao')).toBe(false);
    expect(podeAbrir(FAIXA, 'contexto')).toBe(true);
    expect(podeAbrir(FAIXA, 'faixa')).toBe(true);
  });

  it('deixa voltar a um passo já concluído', () => {
    const completa = { ...FAIXA, genero: 'Indie', contextoCurador: 'Ouça o refrão.' };
    expect(podeAbrir(completa, 'faixa')).toBe(true);
    expect(podeAbrir(completa, 'revisao')).toBe(true);
  });
});

describe('rotuloDaFonte', () => {
  it('distingue link, arquivo e preenchimento manual', () => {
    expect(rotuloDaFonte({ ...FAIXA, origem: 'link' })).toBe('link');
    expect(rotuloDaFonte(FAIXA)).toBe('arquivo');
    expect(rotuloDaFonte({ ...FAIXA, arquivoCaminho: null })).toBe('manual');
  });
});
