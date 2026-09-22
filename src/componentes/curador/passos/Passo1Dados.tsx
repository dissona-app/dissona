'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { CampoDeFoto } from '@/componentes/base/CampoDeFoto';
import { CodigoErro } from '@/lib/erros';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';
import { usePasso } from '../usePasso';

/**
 * A recusa da foto vem por **código**, e não por motivo.
 *
 * `concluir()` em `curador/acoes.ts` devolve `falha(codigo, 'arquivo')` sem
 * `detalhes`, e é de `detalhes.motivo` que `usePasso` tira `motivo`. Enquanto
 * este mapa foi lido por motivo, `erroFotoTipo` e `erroFotoTamanho` estavam
 * escritos e eram inalcançáveis: a pessoa via o texto genérico da superfície de
 * erro. É o mesmo defeito que o passo 6 já corrigiu.
 */
const MENSAGEM_DA_FOTO: Readonly<Partial<Record<CodigoErro, string>>> = {
  [CodigoErro.FORMATO_NAO_SUPORTADO]: CURADOR_CADASTRO.erroFotoTipo,
  [CodigoErro.ARQUIVO_MUITO_GRANDE]: CURADOR_CADASTRO.erroFotoTamanho,
};

export type PropsPasso1 = PropsDoPasso & {
  readonly estado: EstadoDoCadastro;
};

/**
 * Passo 1 — dados básicos.
 *
 * Nome e e-mail em **leitura**: "Nome e e-mail vêm da conta em que você já
 * está. A senha segue a mesma." O protótipo tem uma variante com campo de
 * senha, para quem chega ao passo 1 sem estar logado — mas não é **este**
 * componente: a guarda de `(app)/curador` exige o papel, e o papel exige
 * sessão. Essa variante é `(auth)/curador/cadastrar/page.tsx`, fora da guarda,
 * com a mesma moldura (`MolduraDoWizard` + `PainelDeMarca`) e um formulário
 * de conta de verdade (`FormularioDeContaDoCurador`) em vez deste — sem foto
 * (o upload direto exige sessão, que ali ainda não existe), Nome/E-mail/Senha
 * editáveis em vez de leitura, e sem o "Nome e e-mail vêm da conta..." abaixo.
 *
 * A foto é o único campo gravável, e é opcional. Um passo sem nada obrigatório
 * ainda vale existir: é onde a pessoa confirma que está na conta certa antes de
 * responder oito perguntas.
 */
export function Passo1Dados({ estado, passo, acao, acaoDeVoltar, acaoDePular }: PropsPasso1) {
  // Sem `pendente`: quem desabilita os botões é o `useFormStatus` dentro de
  // `AcoesDoPasso`, que lê o estado do formulário em que ele está.
  const { enviar, falha } = usePasso(acao);

  // Enviar com a foto ainda subindo mandaria `foto_caminho` vazio, e a foto se
  // perderia em silêncio — o `CampoDeFoto` avisa, e o passo trava os botões.
  const [subindoFoto, setSubindoFoto] = useState(false);

  // O erro do upload em si é mostrado pelo próprio `CampoDeFoto`, junto do
  // campo; aqui fica o que volta da **ação**, que é o caminho sem JavaScript.
  const erro = falha === null ? undefined : MENSAGEM_DA_FOTO[falha.codigo];
  const erroGeral = erroGeralDe(falha, [erro]);
  const aviso = erro ?? erroGeral;

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {aviso !== undefined ? (
        <Aviso tom="erro" titulo={aviso}>
          {CURADOR_CADASTRO.fotoHint}
        </Aviso>
      ) : null}

      <CampoDeFoto
        nome={estado.nome}
        aoMudarEnvio={setSubindoFoto}
        tamanhoDoBotao="sm"
        caminhoAtual={estado.fotoCaminho}
        textos={{
          botao: CURADOR_CADASTRO.adicionarFoto,
          hint: CURADOR_CADASTRO.fotoHint,
          enviando: CURADOR_CADASTRO.fotoEnviando,
          enviada: CURADOR_CADASTRO.fotoEnviada,
          erroTipo: CURADOR_CADASTRO.erroFotoTipo,
          erroTamanho: CURADOR_CADASTRO.erroFotoTamanho,
        }}
      />

      <p className={estilos.nota}>{CURADOR_CADASTRO.herdado}</p>

      <div className={estilos.leituras}>
        <div className={estilos.leitura}>
          <span className={estilos.leituraRotulo}>{CURADOR_CADASTRO.rotuloNome}</span>
          <span className={estilos.leituraValor}>{estado.nome}</span>
        </div>
        <div className={estilos.leitura}>
          <span className={estilos.leituraRotulo}>{CURADOR_CADASTRO.rotuloEmail}</span>
          <span className={estilos.leituraValor}>{estado.email}</span>
        </div>
      </div>

      <AcoesDoPasso
        ocupado={subindoFoto}
        passo={passo}
        ultimo={false}
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
