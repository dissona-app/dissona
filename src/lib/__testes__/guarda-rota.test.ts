import { describe, expect, it } from 'vitest';

import { decidirAcesso, inicioDoUsuario, MOTIVO_LOGIN, ROTA } from '../guarda-rota';
import type { LeituraDePapeis } from '../papeis';
import { Papel, SituacaoConta, SituacaoCurador } from '../papeis';

const semSessao: LeituraDePapeis = { estado: 'sem_sessao' };

type Contexto = Extract<LeituraDePapeis, { readonly estado: 'ok' }>;

/**
 * O caso comum: conta ativa, cadastro do curador concluído, onboarding já
 * visto. Cada recorte específico é um ajuste explícito sobre esta base, e o
 * padrão é o que ele é para que o teste diga o que está sendo exercitado — um
 * `onboardingVisto: false` esquecido mandaria metade das asserções para o tour.
 */
const BASE: Omit<Contexto, 'papeis'> = {
  estado: 'ok',
  cadastroCuradorConcluido: true,
  situacao: SituacaoConta.ATIVA,
  situacaoCurador: null,
  onboardingVisto: true,
  ultimoAmbiente: null,
  aceiteTermos: true,
};

const com = (papeis: readonly Papel[], ajustes: Partial<Contexto> = {}): LeituraDePapeis => ({
  ...BASE,
  papeis,
  ...ajustes,
});

const comPapeis = (...papeis: readonly Papel[]): LeituraDePapeis => com(papeis);

const comCadastroPendente = (...papeis: readonly Papel[]): LeituraDePapeis =>
  com(papeis, { cadastroCuradorConcluido: false, situacaoCurador: SituacaoCurador.RASCUNHO });

const semPapel = comPapeis();

function decidir(caminho: string, leitura: LeituraDePapeis) {
  return decidirAcesso({ caminho, leitura });
}

describe('(publico)', () => {
  it('não exige nada', () => {
    for (const caminho of [ROTA.HOME, ROTA.TERMOS, ROTA.PRIVACIDADE]) {
      for (const leitura of [semSessao, semPapel, comPapeis(Papel.ARTISTA)]) {
        expect(decidir(caminho, leitura)).toEqual({ tipo: 'seguir' });
      }
    }
  });
});

describe('route handlers de autenticação', () => {
  it('o callback do OAuth e a confirmação de e-mail não exigem sessão', () => {
    // São o ponto em que a sessão nasce: exigir sessão aqui tornaria
    // impossível criá-la.
    for (const caminho of [ROTA.API_AUTH_CALLBACK, ROTA.API_AUTH_CONFIRMAR]) {
      expect(decidir(caminho, semSessao)).toEqual({ tipo: 'seguir' });
    }
  });
});

describe('código de OAuth que caiu na home', () => {
  const decidirComCodigo = (caminho: string, leitura: LeituraDePapeis, codigo: string | null) =>
    decidirAcesso({ caminho, codigoDeAutenticacao: codigo, leitura });

  it('encaminha o `code` da raiz para o handler que o troca por sessão', () => {
    // O GoTrue descarta um `redirect_to` fora da allow-list e usa o Site URL,
    // sem erro nenhum. Sem este desvio o código morre na home e o login falha
    // calado — que foi exatamente o bug do login com Google.
    expect(decidirComCodigo(ROTA.HOME, semSessao, 'f4843dac-05b3-4672')).toEqual({
      tipo: 'redirecionar',
      para: `${ROTA.API_AUTH_CALLBACK}?code=f4843dac-05b3-4672`,
    });
  });

  it('escapa o código antes de o pôr na query', () => {
    expect(decidirComCodigo(ROTA.HOME, semSessao, 'a b&c=d')).toEqual({
      tipo: 'redirecionar',
      para: `${ROTA.API_AUTH_CALLBACK}?code=a%20b%26c%3Dd`,
    });
  });

  it('não mexe na home sem código', () => {
    for (const codigo of [null, '']) {
      expect(decidirComCodigo(ROTA.HOME, semSessao, codigo)).toEqual({ tipo: 'seguir' });
    }
    expect(decidir(ROTA.HOME, semSessao)).toEqual({ tipo: 'seguir' });
  });

  it('só vale para a raiz — nas demais rotas a guarda de papel continua mandando', () => {
    expect(decidirComCodigo(ROTA.ARTISTA, semSessao, 'abc')).toEqual({
      tipo: 'redirecionar',
      para: `${ROTA.ENTRAR}?proximo=${encodeURIComponent(ROTA.ARTISTA)}`,
    });
    expect(decidirComCodigo(ROTA.API_AUTH_CALLBACK, semSessao, 'abc')).toEqual({
      tipo: 'seguir',
    });
  });
});

describe('(auth)', () => {
  it('deixa entrar quem não tem sessão', () => {
    for (const caminho of [
      ROTA.ENTRAR,
      ROTA.CADASTRAR,
      ROTA.RECUPERAR_SENHA,
      ROTA.REDEFINIR_SENHA,
      ROTA.VERIFICAR_EMAIL,
    ]) {
      expect(decidir(caminho, semSessao)).toEqual({ tipo: 'seguir' });
    }
  });

  it('deixa a verificação de e-mail em paz, com sessão ou sem', () => {
    // Quem entra por SoundCloud chega aqui **autenticado**: a conta nasce sem
    // e-mail, o endereço é colhido em /cadastrar/confirmar e o link fica a
    // caminho. Expulsá-la esconderia o "Reenviar e-mail" bem quando ele serve.
    expect(decidir(ROTA.VERIFICAR_EMAIL, semSessao)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.VERIFICAR_EMAIL, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.VERIFICAR_EMAIL, semPapel)).toEqual({ tipo: 'seguir' });
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

  it('as telas de redefinição são indiferentes à sessão', () => {
    // Não podem expulsar quem tem sessão: o link de recuperação **cria** uma, e
    // é ela que permite trocar a senha sem apresentar a atual.
    //
    // Nem quem não tem: sem sessão a tela mostra "Este link expirou ou já foi
    // usado", com o "Reiniciar recuperação" — mandar essa pessoa ao login
    // esconderia dela justamente o botão de que ela precisa.
    for (const caminho of [ROTA.REDEFINIR_SENHA, ROTA.ADMIN_REDEFINIR_SENHA]) {
      expect(decidir(caminho, semSessao)).toEqual({ tipo: 'seguir' });
      expect(decidir(caminho, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });
      expect(decidir(caminho, comPapeis(Papel.ADMIN))).toEqual({ tipo: 'seguir' });
    }
  });

  it('a redefinição alcança até a conta bloqueada', () => {
    // Quem teve a senha comprometida e a conta suspensa por isso ainda precisa
    // poder trocá-la. Este é o único ramo que roda antes do bloqueio.
    const bloqueada = com([Papel.ARTISTA], { situacao: SituacaoConta.BLOQUEADA });
    expect(decidir(ROTA.REDEFINIR_SENHA, bloqueada)).toEqual({ tipo: 'seguir' });
  });

  it('a confirmação do cadastro social exige sessão, ao contrário do resto de (auth)', () => {
    // Ela só existe **depois** do callback do OAuth, para colher o aceite de
    // termos que o provedor não colhe.
    expect(decidir(ROTA.CADASTRAR_CONFIRMAR, semSessao)).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fcadastrar%2Fconfirmar',
    });
    expect(decidir(ROTA.CADASTRAR_CONFIRMAR, semPapel)).toEqual({ tipo: 'seguir' });
  });
});

describe('aceite de termos pendente', () => {
  // Só acontece com conta social: o cadastro por e-mail exige o aceite, e o
  // trigger o grava a partir do `raw_user_meta_data`.
  const semAceite = com([Papel.ARTISTA], { aceiteTermos: false });

  it('devolve qualquer navegação para a tela de confirmação', () => {
    for (const caminho of ['/artista/carteira', ROTA.CURADOR, ROTA.ONBOARDING, ROTA.ENTRAR]) {
      expect(decidir(caminho, semAceite)).toEqual({
        tipo: 'redirecionar',
        para: ROTA.CADASTRAR_CONFIRMAR,
      });
    }
  });

  it('a própria tela de confirmação é alcançável, senão o redirect cicla', () => {
    expect(decidir(ROTA.CADASTRAR_CONFIRMAR, semAceite)).toEqual({ tipo: 'seguir' });
  });

  it('não alcança o painel administrativo', () => {
    // Conta de admin nasce por convite, e o aceite dela é registrado no aceite
    // do convite (27.3). Mandá-la para uma tela de cadastro de artista seria
    // absurdo — e os ramos de `/admin` retornam antes desta checagem.
    const adminSemAceite = com([Papel.ADMIN], { aceiteTermos: false });
    expect(decidir('/admin/pacotes', adminSemAceite)).toEqual({ tipo: 'seguir' });
  });

  it('a conta bloqueada é ejetada antes — o bloqueio vem primeiro', () => {
    const bloqueadaSemAceite = com([Papel.ARTISTA], {
      aceiteTermos: false,
      situacao: SituacaoConta.BLOQUEADA,
    });
    expect(decidir(ROTA.ARTISTA, bloqueadaSemAceite)).toEqual({
      tipo: 'redirecionar',
      para: `${ROTA.ENTRAR}?motivo=${MOTIVO_LOGIN.BLOQUEADA}`,
    });
  });
});

describe('conta bloqueada', () => {
  const bloqueada = com([Papel.ARTISTA], { situacao: SituacaoConta.BLOQUEADA });
  const excluida = com([Papel.ARTISTA], { situacao: SituacaoConta.EXCLUIDA });
  const destinoDoBanner = `${ROTA.ENTRAR}?motivo=${MOTIVO_LOGIN.BLOQUEADA}`;

  it('é ejetada de qualquer ambiente, com o motivo na URL', () => {
    // O caso real: o admin bloqueia (20.2 / 23.2) alguém que já está
    // navegando. A ação de login não alcança isso — a sessão já existe.
    for (const caminho of ['/artista/carteira', ROTA.CURADOR, '/admin/pacotes', ROTA.ONBOARDING]) {
      expect(decidir(caminho, bloqueada)).toEqual({
        tipo: 'redirecionar',
        para: destinoDoBanner,
      });
    }
  });

  it('alcança as duas telas de login, senão não há como ler o banner', () => {
    expect(decidir(ROTA.ENTRAR, bloqueada)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.ADMIN_ENTRAR, bloqueada)).toEqual({ tipo: 'seguir' });
  });

  it('a conta excluída pelo job é tratada igual', () => {
    expect(decidir(ROTA.ARTISTA, excluida)).toEqual({
      tipo: 'redirecionar',
      para: destinoDoBanner,
    });
  });

  it('a conta desativada NAVEGA — a exclusão é reversível entrando de novo', () => {
    // Barrá-la aqui tornaria os 30 dias de reversão (regras §10) impossíveis de
    // exercer: é o próprio acesso que reverte.
    const desativada = com([Papel.ARTISTA], { situacao: SituacaoConta.DESATIVADA });
    expect(decidir(ROTA.ARTISTA, desativada)).toEqual({ tipo: 'seguir' });
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

describe('onboarding', () => {
  it('exige sessão', () => {
    expect(decidir(ROTA.ONBOARDING, semSessao)).toEqual({
      tipo: 'redirecionar',
      para: '/entrar?proximo=%2Fonboarding',
    });
  });

  it('quem não tem papel escolhe o perfil primeiro', () => {
    expect(decidir(ROTA.ONBOARDING, semPapel)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.SELECAO_DE_PERFIL,
    });
  });

  it('continua acessível depois de visto — "Rever onboarding" (RF-007)', () => {
    expect(decidir(ROTA.ONBOARDING, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });
  });

  it('é o destino do 1º acesso do artista', () => {
    const primeiroAcesso = com([Papel.ARTISTA], { onboardingVisto: false });
    expect(inicioDoUsuario(primeiroAcesso)).toBe(ROTA.ONBOARDING);
    expect(decidir(ROTA.ENTRAR, primeiroAcesso)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ONBOARDING,
    });
  });

  it('mas o curador de 1º acesso vai ao wizard ANTES do tour (PRD 1.4)', () => {
    const curadorNovo = com([Papel.CURADOR], {
      onboardingVisto: false,
      cadastroCuradorConcluido: false,
      situacaoCurador: SituacaoCurador.RASCUNHO,
    });
    expect(inicioDoUsuario(curadorNovo)).toBe(ROTA.CURADOR_CADASTRO);
  });

  it('quem já é artista não é mandado ao wizard por também ter virado curador', () => {
    // Ele tem um ambiente pronto para receber; trocá-lo por um formulário de
    // oito passos que ele não pediu seria pior.
    const dosDois = com([Papel.ARTISTA, Papel.CURADOR], { cadastroCuradorConcluido: false });
    expect(inicioDoUsuario(dosDois)).toBe(ROTA.ARTISTA);
  });
});

describe('último ambiente usado (RF-008)', () => {
  it('ganha da ordem de prioridade', () => {
    const curadorPorUltimo = com([Papel.ARTISTA, Papel.CURADOR], {
      ultimoAmbiente: Papel.CURADOR,
    });
    expect(inicioDoUsuario(curadorPorUltimo)).toBe(ROTA.CURADOR);
  });

  it('é ignorado quando o papel foi desativado depois', () => {
    // Papéis são reversíveis (`ativo = false`). Um `ultimo_ambiente` que
    // aponta para um papel que a conta não tem mais levaria a um
    // redirecionamento em laço.
    const soArtista = com([Papel.ARTISTA], { ultimoAmbiente: Papel.CURADOR });
    expect(inicioDoUsuario(soArtista)).toBe(ROTA.ARTISTA);
  });

  it('sem registro, cai na ordem artista > curador > admin', () => {
    expect(inicioDoUsuario(comPapeis(Papel.ARTISTA, Papel.CURADOR))).toBe(ROTA.ARTISTA);
    expect(inicioDoUsuario(comPapeis(Papel.CURADOR, Papel.ADMIN))).toBe(ROTA.CURADOR);
    expect(inicioDoUsuario(comPapeis(Papel.ADMIN))).toBe(ROTA.ADMIN);
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
    expect(decidir('/curador/fila', comPapeis(Papel.CURADOR))).toEqual({ tipo: 'seguir' });
  });

  it('cadastro pendente vai para o wizard do módulo 12', () => {
    expect(decidir('/curador/fila', comCadastroPendente(Papel.CURADOR))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR_CADASTRO,
    });
  });

  it('o próprio wizard é acessível com cadastro pendente — senão o redirect cicla', () => {
    expect(decidir(ROTA.CURADOR_CADASTRO, comCadastroPendente(Papel.CURADOR))).toEqual({
      tipo: 'seguir',
    });
    expect(decidir('/curador/cadastro/passo-3', comCadastroPendente(Papel.CURADOR))).toEqual({
      tipo: 'seguir',
    });
  });

  it('candidato a Prata não entra no painel, e vai para a tela de análise (12.5)', () => {
    // `cadastroCuradorConcluido` é verdadeiro aqui: o wizard terminou. O que o
    // barra é a `situacao`, e é por isso que ela precisou entrar no contexto.
    const emAnalise = com([Papel.CURADOR], {
      situacaoCurador: SituacaoCurador.PRATA_EM_ANALISE,
    });
    expect(decidir('/curador/fila', emAnalise)).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR_CADASTRO_ANALISE,
    });
  });

  it('Conta e configurações é acessível com cadastro pendente e em análise', () => {
    // É o caminho da LGPD: trocar a senha e excluir a conta não podem depender
    // de o cadastro estar concluído nem de a Prata ter sido aprovada. Uma conta
    // só de curador em `prata_em_analise` ficaria sem nenhuma porta para o
    // direito de exclusão — e a espera pela aprovação é justamente quando
    // alguém desiste.
    expect(decidir(ROTA.CURADOR_CONTA, comCadastroPendente(Papel.CURADOR))).toEqual({
      tipo: 'seguir',
    });

    const emAnalise = com([Papel.CURADOR], {
      situacaoCurador: SituacaoCurador.PRATA_EM_ANALISE,
    });
    expect(decidir(ROTA.CURADOR_CONTA, emAnalise)).toEqual({ tipo: 'seguir' });
  });

  it('"Meu cadastro" (12.6) segue as regras do painel', () => {
    // Ao contrário de Conta, a manutenção pressupõe cadastro concluído: é a
    // tela que edita o que o wizard definiu, e o wizard é quem edita antes.
    expect(decidir(ROTA.CURADOR_MEU_CADASTRO, comPapeis(Papel.CURADOR))).toEqual({
      tipo: 'seguir',
    });
    expect(decidir(ROTA.CURADOR_MEU_CADASTRO, comCadastroPendente(Papel.CURADOR))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.CURADOR_CADASTRO,
    });
  });

  it('a tela de análise é acessível para quem está em análise', () => {
    const emAnalise = com([Papel.CURADOR], {
      situacaoCurador: SituacaoCurador.PRATA_EM_ANALISE,
    });
    expect(decidir(ROTA.CURADOR_CADASTRO_ANALISE, emAnalise)).toEqual({ tipo: 'seguir' });
  });

  it('Bronze aprovado e Prata aprovado entram no painel', () => {
    for (const situacaoCurador of [
      SituacaoCurador.BRONZE_APROVADO,
      SituacaoCurador.PRATA_APROVADO,
      // Prata recusado "permanece Bronze" (20.3) — tem acesso.
      SituacaoCurador.PRATA_RECUSADO,
    ]) {
      expect(decidir('/curador/fila', com([Papel.CURADOR], { situacaoCurador }))).toEqual({
        tipo: 'seguir',
      });
    }
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

  it('o aceite de convite não exige papel admin — nem sessão', () => {
    // Papel: é o ato que **concede** o papel (27.3). No ramo do painel, a guarda
    // barraria toda pessoa convidada, e nenhuma conta administrativa nasceria.
    expect(decidir(ROTA.ADMIN_CONVITE, semPapel)).toEqual({ tipo: 'seguir' });
    expect(decidir(ROTA.ADMIN_CONVITE, comPapeis(Papel.ARTISTA))).toEqual({ tipo: 'seguir' });

    // Sessão: `exigirSessao` monta o `?proximo=` a partir do **pathname**, sem a
    // query. Redirecionar quem chega sem sessão a traria de volta sem o token,
    // para uma tela que não sabe mais qual convite era. A tela tem um estado
    // próprio para isso, e o link continua na caixa de entrada da pessoa.
    expect(decidir(ROTA.ADMIN_CONVITE, semSessao)).toEqual({ tipo: 'seguir' });
  });

  it('Conta e equipe segue as regras do painel', () => {
    expect(decidir(ROTA.ADMIN_EQUIPE, comPapeis(Papel.ADMIN))).toEqual({ tipo: 'seguir' });
    // Sem papel admin, nem a aba de dados pessoais: quem decide o que aparece
    // **dentro** da tela é `tem_permissao('equipe')`; quem decide se a tela
    // existe é o papel.
    expect(decidir(ROTA.ADMIN_EQUIPE, comPapeis(Papel.ARTISTA))).toEqual({
      tipo: 'redirecionar',
      para: ROTA.ADMIN_ENTRAR,
    });
  });

  it('não confunde /admin com outra rota de mesmo prefixo', () => {
    expect(decidir('/administradores', semSessao)).toEqual({ tipo: 'seguir' });
  });
});

describe('sem sessão', () => {
  it('barra todo ambiente autenticado', () => {
    expect(decidir(ROTA.ARTISTA, semSessao).tipo).toBe('redirecionar');
    expect(decidir(ROTA.CURADOR, semSessao).tipo).toBe('redirecionar');
    expect(decidir(ROTA.ADMIN, semSessao).tipo).toBe('redirecionar');
    expect(decidir(ROTA.ONBOARDING, semSessao).tipo).toBe('redirecionar');
  });

  it('manda para a home pública quando não há como escolher ambiente', () => {
    expect(inicioDoUsuario(semSessao)).toBe(ROTA.HOME);
  });
});
