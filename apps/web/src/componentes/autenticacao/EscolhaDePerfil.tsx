'use client';

import { useActionState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { SELECAO_DE_PERFIL } from '@dissona/nucleo/textos/prototipo';

import estilos from './EscolhaDePerfil.module.css';

export type PropsEscolhaDePerfil = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

const ESTADO_INICIAL: ResultadoDeAcao | null = null;

const OPCOES = [
  {
    papel: 'artista',
    titulo: SELECAO_DE_PERFIL.artistaTitulo,
    texto: SELECAO_DE_PERFIL.artistaTexto,
    nota: undefined,
  },
  {
    papel: 'curador',
    titulo: SELECAO_DE_PERFIL.curadorTitulo,
    texto: SELECAO_DE_PERFIL.curadorTexto,
    nota: SELECAO_DE_PERFIL.notaCurador,
  },
] as const;

/**
 * Tela 1.4 — seleção de perfil.
 *
 * **Derivada**: não existe em protótipo nenhum (Design System §3.5), e a
 * anotação do arquivo do Curador confirma. A forma vem do card selecionável do
 * §2.4.2, dentro da moldura de autenticação.
 *
 * ## Dois `<form>`, e não um `<form>` com dois radios
 *
 * O protótipo de referência para escolha única seria o segmented control ou o
 * card selecionável — os dois pedem seleção, e depois um "Continuar". Aqui a
 * escolha **é** a ação: são dois caminhos, cada um com seu destino, e o passo
 * intermediário de confirmar não acrescenta nada. Um clique, uma decisão.
 *
 * Cada card é o `<button type="submit">` do seu próprio formulário. Funciona
 * sem JavaScript, é alcançável por `Tab`, e o leitor de tela anuncia um botão —
 * que é exatamente o que ele é.
 *
 * O `pendente` desabilita os dois: sem isso, um duplo clique nos dois cards
 * ativaria os dois papéis, e a pessoa cairia num ambiente que não escolheu.
 */
export function EscolhaDePerfil({ acao }: PropsEscolhaDePerfil) {
  const [resultado, escolher, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    ESTADO_INICIAL,
  );

  const falhou = resultado !== null && !resultado.ok;

  return (
    <>
      <div className={estilos.cabecalho}>
        <span className={estilos.overline}>{SELECAO_DE_PERFIL.overline}</span>
        <h1 className={estilos.titulo}>{SELECAO_DE_PERFIL.titulo}</h1>
        <p className={estilos.subtitulo}>{SELECAO_DE_PERFIL.subtitulo}</p>
      </div>

      {falhou ? (
        <Aviso tom="erro" titulo={SELECAO_DE_PERFIL.erroSemEscolha}>
          {SELECAO_DE_PERFIL.nota}
        </Aviso>
      ) : null}

      <div className={estilos.opcoes}>
        {OPCOES.map((opcao) => (
          <form key={opcao.papel} action={escolher}>
            <input type="hidden" name="papel" value={opcao.papel} />
            <button type="submit" className={estilos.cartao} disabled={pendente}>
              <span className={estilos.cartaoTitulo}>{opcao.titulo}</span>
              <span className={estilos.cartaoTexto}>{opcao.texto}</span>
              {opcao.nota !== undefined ? (
                <span className={estilos.cartaoNota}>{opcao.nota}</span>
              ) : null}
              <span className={estilos.cartaoAcao} aria-hidden="true">
                {pendente ? SELECAO_DE_PERFIL.enviando : SELECAO_DE_PERFIL.enviar}
              </span>
            </button>
          </form>
        ))}
      </div>

      <p className={estilos.nota}>{SELECAO_DE_PERFIL.nota}</p>
    </>
  );
}
