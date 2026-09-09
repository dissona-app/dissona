import { describe, expect, it } from 'vitest';

import { ROTA } from '@/lib/guarda-rota';
import { ADMIN_PACOTE_FORMULARIO, ADMIN_PACOTES } from '@/textos/prototipo';

import { NOME_AMBIENTE } from '../navegacao-por-ambiente';
import { tituloDoCaminho } from '../titulo-por-caminho';

/**
 * O `<h1>` do painel administrativo sai daqui, então um erro neste mapa é um
 * título errado na tela — e, no caso de `/admin/pacotes/novo`, um título que
 * diz "Editar pacote" numa tela de criação.
 *
 * Também é onde a fidelidade ao protótipo é verificável sem navegador: os
 * títulos e sublegendas têm de ser os mesmos que `textos/prototipo` declara,
 * porque as duas fontes descrevem a mesma tela.
 */
describe('título do header por caminho', () => {
  it('a lista de pacotes usa o título e a sublegenda do protótipo', () => {
    const { titulo, sublegenda } = tituloDoCaminho(`${ROTA.ADMIN}/pacotes`, 'admin');
    expect(titulo).toBe(ADMIN_PACOTES.titulo);
    expect(sublegenda).toBe(ADMIN_PACOTES.subtitulo);
  });

  it('/novo é "Novo pacote", e não "Editar pacote"', () => {
    // A rota exata tem de vencer a regra de prefixo `"/admin/pacotes/"`, senão
    // a tela de criação abriria dizendo "Editar pacote".
    const { titulo, sublegenda } = tituloDoCaminho(`${ROTA.ADMIN}/pacotes/novo`, 'admin');
    expect(titulo).toBe(ADMIN_PACOTE_FORMULARIO.tituloNovo);
    expect(sublegenda).toBe(ADMIN_PACOTE_FORMULARIO.subtitulo);
  });

  it('um id de pacote é "Editar pacote"', () => {
    const { titulo, sublegenda } = tituloDoCaminho(
      `${ROTA.ADMIN}/pacotes/018f4a2e-0000-7000-8000-000000000000`,
      'admin',
    );
    expect(titulo).toBe(ADMIN_PACOTE_FORMULARIO.tituloEditar);
    expect(sublegenda).toBe(ADMIN_PACOTE_FORMULARIO.subtitulo);
  });

  it('a barra final não muda o título', () => {
    expect(tituloDoCaminho(`${ROTA.ADMIN}/pacotes/`, 'admin').titulo).toBe(ADMIN_PACOTES.titulo);
  });

  it('a raiz do admin é o painel', () => {
    expect(tituloDoCaminho(ROTA.ADMIN, 'admin').titulo).toBe('Painel administrativo');
  });

  it('rota sem entrada no mapa cai no nome do ambiente', () => {
    // É o que acontece com as telas que ainda não existem. Melhor um título
    // genérico que um `<h1>` vazio, que quebraria a estrutura de headings.
    expect(tituloDoCaminho(`${ROTA.ADMIN}/inexistente`, 'admin').titulo).toBe(NOME_AMBIENTE.admin);
    expect(tituloDoCaminho(`${ROTA.ARTISTA}/carteira`, 'artista').titulo).toBe(
      NOME_AMBIENTE.artista,
    );
  });

  it('todo título tem sublegenda, menos o de fallback', () => {
    // A sublegenda é o `appSub` do protótipo, e ele a define para os seis
    // módulos do admin. Um título mapeado sem sublegenda seria esquecimento.
    for (const caminho of [
      ROTA.ADMIN,
      `${ROTA.ADMIN}/usuarios`,
      `${ROTA.ADMIN}/pacotes`,
      `${ROTA.ADMIN}/pacotes/novo`,
      `${ROTA.ADMIN}/financeiro`,
      `${ROTA.ADMIN}/moderacao`,
      `${ROTA.ADMIN}/equipe`,
    ]) {
      expect(tituloDoCaminho(caminho, 'admin').sublegenda, caminho).toBeDefined();
    }
  });
});
