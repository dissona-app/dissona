import { describe, expect, it } from 'vitest';

import {
  enderecoDoOembed,
  interpretarOembed,
  lerMetadados,
  passoAlcancado,
  podeAbrir,
  provedorDoLink,
  rotuloDaFonte,
  validarAudio,
} from '../servico';
import type { FaixaEmEdicao, LimitesDeUpload, MetadadosDetectados } from '../tipos';

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
  metadadosDetectados: null,
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
    expect(rotuloDaFonte({ ...FAIXA, origem: 'link', metadadosDetectados: DETECTADO })).toBe(
      'link',
    );
    expect(rotuloDaFonte(FAIXA)).toBe('arquivo');
    expect(rotuloDaFonte({ ...FAIXA, arquivoCaminho: null })).toBe('manual');
  });

  it('link sem detecção é preenchimento manual', () => {
    expect(rotuloDaFonte({ ...FAIXA, origem: 'link' })).toBe('manual');
  });
});

const DETECTADO: MetadadosDetectados = {
  provedor: 'youtube',
  url: 'https://www.youtube.com/watch?v=abc',
  titulo: 'Aurora',
  artista: 'Banda',
  capaUrl: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
};

describe('provedorDoLink', () => {
  it('reconhece Spotify e YouTube pelo host, com ou sem esquema', () => {
    expect(provedorDoLink('https://open.spotify.com/track/123')).toBe('spotify');
    expect(provedorDoLink('open.spotify.com/track/123')).toBe('spotify');
    expect(provedorDoLink('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(provedorDoLink('youtu.be/abc')).toBe('youtube');
    expect(provedorDoLink('https://music.youtube.com/watch?v=abc')).toBe('youtube');
  });

  it('recusa host que só menciona o provedor — a URL vai para um fetch do servidor', () => {
    expect(provedorDoLink('https://evil.com/?u=open.spotify.com')).toBeNull();
    expect(provedorDoLink('https://open.spotify.com.evil.com/track/1')).toBeNull();
    expect(provedorDoLink('https://youtube.com@evil.com/x')).toBeNull();
  });

  it('recusa http e o que não é URL', () => {
    expect(provedorDoLink('http://open.spotify.com/track/1')).toBeNull();
    expect(provedorDoLink('não é link')).toBeNull();
  });
});

describe('enderecoDoOembed', () => {
  it('monta o endpoint de cada provedor com o link codificado', () => {
    expect(enderecoDoOembed('open.spotify.com/track/1')).toBe(
      'https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F1',
    );
    expect(enderecoDoOembed('https://youtu.be/abc')).toBe(
      'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fyoutu.be%2Fabc',
    );
    expect(enderecoDoOembed('https://evil.com')).toBeNull();
  });
});

describe('interpretarOembed', () => {
  it('traduz a resposta do YouTube', () => {
    expect(
      interpretarOembed('https://www.youtube.com/watch?v=abc', {
        title: 'Aurora',
        author_name: 'Banda',
        thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      }),
    ).toEqual(DETECTADO);
  });

  it('aceita o Spotify, que não informa artista', () => {
    expect(
      interpretarOembed('https://open.spotify.com/track/1', {
        title: 'Aurora',
        thumbnail_url: 'https://image-cdn-ak.spotifycdn.com/image/x',
      }),
    ).toMatchObject({ provedor: 'spotify', artista: null });
  });

  it('sem título não há faixa encontrada; capa fora de https é descartada', () => {
    expect(interpretarOembed('https://youtu.be/abc', { author_name: 'Banda' })).toBeNull();
    expect(interpretarOembed('https://youtu.be/abc', 'erro')).toBeNull();
    expect(
      interpretarOembed('https://youtu.be/abc', { title: 'A', thumbnail_url: 'javascript:1' }),
    ).toBeNull();
  });
});

describe('lerMetadados', () => {
  it('lê do banco e do campo escondido', () => {
    expect(lerMetadados(DETECTADO)).toEqual(DETECTADO);
    expect(lerMetadados(JSON.stringify(DETECTADO))).toEqual(DETECTADO);
    expect(lerMetadados('')).toBeNull();
    expect(lerMetadados(null)).toBeNull();
    expect(lerMetadados('{quebrado')).toBeNull();
  });

  it('descarta metadado forjado: provedor e URL têm de concordar', () => {
    expect(lerMetadados({ ...DETECTADO, url: 'https://evil.com/x' })).toBeNull();
    expect(lerMetadados({ ...DETECTADO, provedor: 'spotify' })).toBeNull();
    expect(lerMetadados({ ...DETECTADO, capaUrl: 'http://x.com/a.jpg' })).toBeNull();
  });
});
