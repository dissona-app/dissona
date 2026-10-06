'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Selecao } from '@dissona/nucleo/componentes/base/Selecao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import type { LinhaDaEquipe } from '@dissona/nucleo/modulos/equipe/tipos';
import { mensagemDaFalha } from '@dissona/nucleo/textos/erros';
import { PAPEIS_ADMIN, rotuloDoPapel } from '@dissona/nucleo/modulos/equipe/tipos';
import { EQUIPE } from '@dissona/nucleo/textos/prototipo';

import estilos from './ListaDaEquipe.module.css';

const { equipe: TEXTOS } = EQUIPE;

const OPCOES_DE_PAPEL = PAPEIS_ADMIN.map((papel) => ({
  valor: papel.valor,
  rotulo: papel.rotulo,
}));

export type PropsListaDaEquipe = {
  readonly linhas: readonly LinhaDaEquipe[];
  readonly acaoDePapel: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeAcesso: (dados: FormData) => Promise<ResultadoDeAcao>;
  /**
   * O reenvio devolve o link do convite (a mesma ação de convidar), e a lista
   * usa só o `ok` — daí `ResultadoDeAcao<unknown>` em vez do tipo exato: a
   * linha não mostra o link, quem mostra é o diálogo de convite.
   */
  readonly acaoDeReenvio: (dados: FormData) => Promise<ResultadoDeAcao<unknown>>;
  /** Renderizado no cabeçalho, à direita do resumo. */
  readonly acaoDeConvidar: React.ReactNode;
};

/**
 * "Integrantes" — a lista de equipe (27.2).
 *
 * ## Uma lista, duas origens
 *
 * Cada linha é um integrante de verdade (`membroId`) **ou** um convite pendente
 * (`conviteId`). A RPC `ler_equipe_admin` já as une e ordena; a tela não
 * precisa saber que são duas tabelas — só que uma linha de convite não tem nome
 * nem cargo, e não oferece papel editável (ainda não há membro a alterar).
 *
 * ## Por que o papel salva por formulário, e não no `change`
 *
 * No protótipo o `<select>` de papel dispara `onChange` e "salva". Aqui cada
 * linha é um `<form>` com o `<select>` e um botão "Aplicar". Custa um clique a
 * mais e paga por ele três vezes: a linha funciona sem JavaScript, existe um
 * lugar para o estado "aplicando", e a troca deixa de acontecer por engano
 * quando alguém rola a lista com o teclado sobre o select — que é um acidente
 * real desse padrão.
 *
 * ## A própria linha não tem controle nenhum
 *
 * `souEu` desliga o select e as ações, e mostra "Você". Não é só cortesia: as
 * RPCs da `0003d` recusam a própria linha com `DS020`, porque o único
 * administrador que se rebaixasse trancaria a organização fora da gestão de
 * equipe. A tela não oferece o que o servidor vai negar.
 */
export function ListaDaEquipe({
  linhas,
  acaoDePapel,
  acaoDeAcesso,
  acaoDeReenvio,
  acaoDeConvidar,
}: PropsListaDaEquipe) {
  // O aviso carrega **tom**: as três ações de linha (papel, acesso, reenvio)
  // descartavam o resultado e só anunciavam sucesso — uma recusa da RPC, como o
  // `DS020` de quem tenta mudar o próprio papel, não dizia nada e a linha
  // simplesmente não mudava.
  const [aviso, setAviso] = useState<{ tom: 'sucesso' | 'erro'; texto: string } | null>(null);

  const ativos = linhas.filter((linha) => linha.situacao === 'ativo').length;
  const pendentes = linhas.filter(
    (linha) => linha.situacao === 'pendente' || linha.situacao === 'expirado',
  ).length;

  return (
    <section className={estilos.base} aria-label={TEXTOS.overline}>
      <div className={estilos.cabecalho}>
        <div className={estilos.textos}>
          <span className={estilos.overline}>{TEXTOS.overline}</span>
          <span className={estilos.resumo}>{TEXTOS.resumo(ativos, pendentes)}</span>
        </div>
        {acaoDeConvidar}
      </div>

      {aviso === null ? null : (
        <div className={estilos.faixaDeAviso}>
          <Aviso tom={aviso.tom}>{aviso.texto}</Aviso>
        </div>
      )}

      {linhas.length === 0 ? (
        <EstadoVazio titulo={TEXTOS.vazio} descricao={TEXTOS.vazioNota} />
      ) : (
        <div className={estilos.rolagem}>
          <div className={estilos.cabecalhoDaGrade} aria-hidden="true">
            <span>{TEXTOS.colunaMembro}</span>
            <span>{TEXTOS.colunaEmail}</span>
            <span>{TEXTOS.colunaPapel}</span>
            <span>{TEXTOS.colunaAcoes}</span>
            <span className={estilos.alinhadoADireita}>{TEXTOS.colunaStatus}</span>
          </div>

          <ul className={estilos.linhas}>
            {linhas.map((linha) => (
              <LinhaDeMembro
                key={linha.membroId ?? linha.conviteId ?? linha.email}
                linha={linha}
                acaoDePapel={acaoDePapel}
                acaoDeAcesso={acaoDeAcesso}
                acaoDeReenvio={acaoDeReenvio}
                onAviso={setAviso}
              />
            ))}
          </ul>
        </div>
      )}

      <p className={estilos.nota}>{TEXTOS.nota}</p>
    </section>
  );
}

type PropsLinha = {
  readonly linha: LinhaDaEquipe;
  readonly acaoDePapel: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeAcesso: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeReenvio: (dados: FormData) => Promise<ResultadoDeAcao<unknown>>;
  readonly onAviso: (aviso: { tom: 'sucesso' | 'erro'; texto: string }) => void;
};

function LinhaDeMembro({ linha, acaoDePapel, acaoDeAcesso, acaoDeReenvio, onAviso }: PropsLinha) {
  const primeiroNome = (linha.nome ?? linha.email).split(/[\s@]/)[0] ?? linha.email;
  const ehConvite = linha.membroId === null;
  const inativo = linha.situacao === 'inativo';

  // Os avisos saem **dentro** da ação, e não de um efeito que observa o
  // resultado: aqui é o tratamento do submit, e `setState` em efeito encadeia
  // renders sem precisar.
  const [, aplicarPapel, aplicandoPapel] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => {
      const resultado = await acaoDePapel(dados);
      if (resultado.ok) onAviso({ tom: 'sucesso', texto: TEXTOS.papelAtualizado(primeiroNome) });
      else onAviso({ tom: 'erro', texto: mensagemDaFalha(resultado) });
      return resultado;
    },
    null,
  );

  const [, aplicarAcesso, aplicandoAcesso] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => {
      const resultado = await acaoDeAcesso(dados);
      if (resultado.ok) {
        onAviso({
          tom: 'sucesso',
          texto: inativo ? TEXTOS.reativado(primeiroNome) : TEXTOS.desativado(primeiroNome),
        });
      } else {
        onAviso({ tom: 'erro', texto: mensagemDaFalha(resultado) });
      }
      return resultado;
    },
    null,
  );

  const [, reenviar, reenviando] = useActionState<ResultadoDeAcao<unknown> | null, FormData>(
    async (_anterior, dados) => {
      const resultado = await acaoDeReenvio(dados);
      // Só anuncia se de fato reenviou. O limite de e-mail do SMTP embutido é a
      // falha comum aqui, e um "Convite reenviado" sobre ela mandaria a pessoa
      // esperar um e-mail que não saiu.
      if (resultado.ok) onAviso({ tom: 'sucesso', texto: TEXTOS.conviteReenviado(linha.email) });
      else onAviso({ tom: 'erro', texto: mensagemDaFalha(resultado) });
      return resultado;
    },
    null,
  );

  return (
    <li
      className={[estilos.linha, inativo ? estilos.linhaInativa : undefined]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={estilos.membro}>
        <span className={estilos.avatar} aria-hidden="true">
          {iniciaisDe(linha.nome ?? linha.email)}
        </span>
        <span className={estilos.identidade}>
          <span className={estilos.nome}>{linha.nome ?? linha.email}</span>
          <span className={estilos.tag}>
            {ehConvite ? TEXTOS.tagConvite : (linha.cargo ?? TEXTOS.semCargo)}
          </span>
        </span>
      </div>

      <span className={estilos.email}>{linha.email}</span>

      <span className={estilos.papel}>
        {ehConvite || linha.souEu ? (
          // Convite não tem membro a alterar, e a própria linha é recusada pela
          // RPC. Nos dois casos o papel é leitura.
          <span className={estilos.papelFixo}>{rotuloDoPapel(linha.papelAdmin)}</span>
        ) : (
          <form action={aplicarPapel} className={estilos.formularioDoPapel}>
            <input type="hidden" name="membroId" value={linha.membroId ?? ''} />
            <Selecao
              name="papel"
              rotulo={TEXTOS.colunaPapel}
              rotuloOculto
              variante="tabela"
              defaultValue={linha.papelAdmin}
              opcoes={OPCOES_DE_PAPEL}
              disabled={aplicandoPapel}
            />
            <Botao type="submit" variante="ghost" carregando={aplicandoPapel}>
              {aplicandoPapel ? TEXTOS.aplicando : TEXTOS.aplicarPapel}
            </Botao>
          </form>
        )}
      </span>

      <span className={estilos.acoes}>
        {linha.souEu ? <span className={estilos.voce}>{TEXTOS.voce}</span> : null}

        {ehConvite && !linha.souEu ? (
          <form action={reenviar}>
            {/* O reenvio é o mesmo caminho do convite novo: `criar_convite_admin`
                apaga o pendente e rotaciona o token. Por isso vão e-mail e
                papel, e não o id do convite. */}
            <input type="hidden" name="email" value={linha.email} />
            <input type="hidden" name="papel" value={linha.papelAdmin} />
            <Botao type="submit" variante="ghost" carregando={reenviando}>
              {reenviando ? TEXTOS.reenviando : TEXTOS.reenviar}
            </Botao>
          </form>
        ) : null}

        {!ehConvite && !linha.souEu ? (
          <form action={aplicarAcesso}>
            <input type="hidden" name="membroId" value={linha.membroId ?? ''} />
            <input type="hidden" name="ativo" value={inativo ? 'true' : 'false'} />
            <Botao
              type="submit"
              variante={inativo ? 'ghost' : 'destrutivo'}
              carregando={aplicandoAcesso}
            >
              {aplicandoAcesso ? TEXTOS.aplicando : inativo ? TEXTOS.reativar : TEXTOS.desativar}
            </Botao>
          </form>
        ) : null}
      </span>

      <span className={estilos.status}>
        <Etiqueta tom={TOM_DA_SITUACAO[linha.situacao]} dot={DOT_DA_SITUACAO[linha.situacao]}>
          {TEXTOS.situacao[linha.situacao]}
        </Etiqueta>
      </span>
    </li>
  );
}

const TOM_DA_SITUACAO: Readonly<
  Record<LinhaDaEquipe['situacao'], 'sucesso' | 'alerta' | 'neutro' | 'erro'>
> = {
  ativo: 'sucesso',
  pendente: 'alerta',
  inativo: 'neutro',
  expirado: 'erro',
};

const DOT_DA_SITUACAO: Readonly<
  Record<LinhaDaEquipe['situacao'], 'sucesso' | 'pendente' | 'desativado' | 'erro'>
> = {
  ativo: 'sucesso',
  pendente: 'pendente',
  inativo: 'desativado',
  expirado: 'erro',
};

/** Duas iniciais, como o protótipo monta. Convite cai no e-mail. */
function iniciaisDe(texto: string): string {
  const partes = texto.split(/[\s@._-]+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
