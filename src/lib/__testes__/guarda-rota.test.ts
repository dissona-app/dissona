import { describe, expect, it } from 'vitest';

import { decidirAcesso, inicioDoUsuario, ROTA } from '../guarda-rota';
import type { LeituraDePapeis } from '../papeis';
import { Papel } from '../papeis';

const semSessao: LeituraDePapeis = { estado: 'sem_sessao' };
/** Janela da R0: sessão real, mas `papel_usuario` ainda não existe. */
const semEsquema: LeituraDePapeis = { estado: 'sem_esquema' };
const comPapeis = (...papeis: readonly Papel[]): LeituraDePapeis => ({ estado: 'ok', papeis });
const semPapel = comPapeis();

function decidir(
  caminho: string,
  leitura: LeituraDePapeis,
  cadastroCurador: boolean | null = null,
) {
  return decidirAcesso({ caminho, leitura, cadastroCuradorConcluido: cadastroCurador });
}

describe('(publico)', () => {
  it('não exige nada', () => {
    for (const caminho of [ROTA.HOME, ROTA.TERMOS, ROTA.PRIVACIDADE]) {
      for (const leitura of [semSessao, semEsquema, semPapel, comPapeis(Papel.ARTISTA)]) {
        expect(decidir(caminho, leitura)).toEqual({ tipo: 'seguir' });
      }
    }
  });
});

describe('(auth)', () => {
  it('deixa entrar quem não tem sessão', () => {
    for (const caminho of [
      ROTA.ENTRAR,
      ROTA.CADASTRAR,
      ROTA.RECUPERAR_SENHA,
      ROTA.VERIFICAR_EMAIL,
    ]) {
      expect(decidir(caminho, semSessao)).toEqual({ tipo: 'seguir' });
    }
  });

  it('redireciona quem já está autenticado para o seu início', () => {
    expect(decidir(ROTA.ENTRAR, comPapeis(Papel.ARTISTA))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ARTISTA,
    });
    expect(decidir(ROTA.ENTRAR, comPapeis(Papel.CURADOR))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR,
    });
    expect(decidir(ROTA.ENTRAR, semPapel)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.SELECAO_DE_PERFIL,
    });
  });
});

describe('seleção de perfil', () => {
  it('exige sessão e preserva o destino', () => {
    expect(decidir(ROTA.SELECAO_DE_PERFIL, semSessao)).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fselecao-de-perfil',
    });
  });

  it('deixa passar quem tem sessão e nenhum papel', () => {
    expect(decidir(ROTA.SELECAO_DE_PERFIL, semPapel)).toEqual({ tipo: 'seguir' });
  });

  it('não faz quem já tem papel escolher de novo', () => {
    expect(decidir(ROTA.SELECAO_DE_PERFIL, comPapeis(Papel.CURADOR))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR,
    });
  });
});

describe('(app)/artista', () => {
  it('sem sessão manda para o login com o destino preservado', () => {
    expect(decidir('/artista/carteira', semSessao)).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fartista%2Fcarteira',
    });
  });

  it('com o papel certo, segue', () => {
    expect(decidir(ROTA.ARTISTA, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });
    expect(decidir('/artista/catalogo', comPapeis(Papel.ARTISTA, Papel.CURADOR))).toEqual({
      tipo: 'seguir',
    });
  });

  it('com papel errado, vai para o próprio ambiente', () => {
    expect(decidir(ROTA.ARTISTA, comPapeis(Papel.CURADOR))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR,
    });
  });

  it('com sessão e sem papel nenhum, vai escolher perfil', () => {
    expect(decidir(ROTA.ARTISTA, semPapel)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.SELECAO_DE_PERFIL,
    });
  });
});

describe('(app)/curador', () => {
  it('com o papel certo e cadastro concluído, segue', () => {
    expect(decidir('/curador/fila', comPapeis(Papel.CURADOR), true)).toEqual({ tipo: 'seguir' });
  });

  it('cadastro pendente vai para o wizard do módulo 12', () => {
    expect(decidir('/curador/fila', comPapeis(Papel.CURADOR), false)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR_CADASTRO,
    });
  });

  it('o próprio wizard é acessível com cadastro pendente — senão o redirect cicla', () => {
    expect(decidir(ROTA.CURADOR_CADASTRO, comPapeis(Papel.CURADOR), false)).toEqual({
      tipo: 'seguir',
    });
    expect(decidir('/curador/cadastro/passo-3', comPapeis(Papel.CURADOR), false)).toEqual({
      tipo: 'seguir',
    });
  });

  it('papel errado vai para o próprio ambiente', () => {
    expect(decidir(ROTA.CURADOR, comPapeis(Papel.ARTISTA))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ARTISTA,
    });
  });
});

describe('(admin)', () => {
  it('o painel exige sessão, e manda para o login próprio do admin', () => {
    expect(decidir('/admin/usuarios', semSessao)).toEqual({
      tipo: 'redirecionar',
      para: '/admin/entrar?proximo=%2Fadmin%2Fusuarios',
    });
  });

  it('sessão sem papel admin não entra no painel', () => {
    expect(decidir(ROTA.ADMIN, comPapeis(Papel.ARTISTA))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ADMIN_ENTRAR,
    });
  });

  it('admin entra', () => {
    expect(decidir('/admin/financeiro', comPapeis(Papel.ADMIN))).toEqual({ tipo: 'seguir' });
  });

  it('o login do admin é aberto para quem não é admin', () => {
    expect(decidir(ROTA.ADMIN_ENTRAR, semSessao)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.ADMIN_ENTRAR, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });
  });

  it('admin autenticado não fica na tela de login', () => {
    expect(decidir(ROTA.ADMIN_ENTRAR, comPapeis(Papel.ADMIN))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ADMIN,
    });
  });

  it('não confunde /admin com outra rota de mesmo prefixo', () => {
    expect(decidir('/administradores', semSessao)).toEqual({ tipo: 'seguir' });
  });
});

describe('janela da R0 — sem o esquema de papéis', () => {
  it('exige sessão, mas não aplica recorte de papel que ainda não existe', () => {
    expect(decidir(ROTA.ARTISTA, semEsquema)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.CURADOR, semEsquema)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.ADMIN, semEsquema)).toEqual({ tipo: 'seguir' });
  });

  it('continua barrando quem não tem sessão', () => {
    expect(decidir(ROTA.ARTISTA, semSessao).tipo).toBe('redirecionar');
    expect(decidir(ROTA.ADMIN, semSessao).tipo).toBe('redirecionar');
  });

  it('manda para a home pública quando não há como escolher ambiente', () => {
    expect(inicioDoUsuario(semEsquema)).toBe(ROTA.HOME);
  });
});
