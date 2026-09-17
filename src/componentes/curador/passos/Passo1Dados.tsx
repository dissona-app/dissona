'use client';

import { Aviso } from '@/componentes/base/Aviso';
import { CodigoErro } from '@/lib/erros';
import { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/modulos/curador/esquemas';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';
import { usePasso } from '../usePasso';
import { useUploadDireto } from '../useUploadDireto';

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
 * senha, para quem chega ao wizard sem estar logado; no produto isso não
 * acontece — a guarda de `(app)/curador` exige o papel, e o papel exige sessão.
 *
 * A foto é o único campo gravável, e é opcional. Um passo sem nada obrigatório
 * ainda vale existir: é onde a pessoa confirma que está na conta certa antes de
 * responder oito perguntas.
 */
export function Passo1Dados({ estado, passo, acao, acaoDeVoltar, acaoDePular }: PropsPasso1) {
  // Sem `pendente`: quem desabilita os botões é o `useFormStatus` dentro de
  // `AcoesDoPasso`, que lê o estado do formulário em que ele está.
  const { enviar, falha } = usePasso(acao);

  const foto = useUploadDireto({
    balde: 'avatares',
    nomeBase: 'perfil',
    tipos: FOTO_TIPOS,
    maxBytes: FOTO_MAX_BYTES,
    mensagens: {
      tipo: CURADOR_CADASTRO.erroFotoTipo,
      tamanho: CURADOR_CADASTRO.erroFotoTamanho,
    },
  });

  const erro = falha === null ? undefined : MENSAGEM_DA_FOTO[falha.codigo];
  const erroGeral = erroGeralDe(falha, [erro]);
  const aviso = foto.erro ?? erro ?? erroGeral;

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {aviso !== undefined ? (
        <Aviso tom="erro" titulo={aviso}>
          {CURADOR_CADASTRO.fotoHint}
        </Aviso>
      ) : null}

      <div className={estilos.foto}>
        <span className={estilos.avatar} aria-hidden="true">
          {iniciaisDe(estado.nome)}
        </span>

        <div className={estilos.fotoTextos}>
          {/*
            `<label>` envolvendo o input de arquivo: é o que dá um alvo de
            clique do tamanho do botão sem precisar de `onClick` e de um input
            escondido controlado por JavaScript.
          */}
          <label className={estilos.fotoBotao}>
            {CURADOR_CADASTRO.adicionarFoto}
            {/* O `name` fica: sem JavaScript o `onChange` não roda, e o arquivo
                volta a viajar no `multipart` para `salvarPasso1` validar. */}
            <input
              type="file"
              name="foto"
              accept="image/jpeg,image/png"
              className={estilos.arquivo}
              onChange={foto.aoEscolher}
            />
          </label>
          {/* O caminho é o que a ação grava; o arquivo já não viaja no corpo. */}
          <input type="hidden" name="foto_caminho" value={foto.caminho} />

          <span className={estilos.fotoHint} aria-live="polite">
            {foto.subindo
              ? CURADOR_CADASTRO.fotoEnviando
              : (foto.nome ??
                (estado.fotoCaminho === null
                  ? CURADOR_CADASTRO.fotoHint
                  : CURADOR_CADASTRO.fotoEnviada))}
          </span>
        </div>
      </div>

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
        ocupado={foto.subindo}
        passo={passo}
        ultimo={false}
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}

/** Duas iniciais, como o `initials` do protótipo. */
function iniciaisDe(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
