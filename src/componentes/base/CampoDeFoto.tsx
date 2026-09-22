'use client';

import { useEffect } from 'react';

import { FOTO_MAX_BYTES, FOTO_TIPOS } from '@/lib/arquivos';
import { iniciaisDe } from '@/lib/iniciais';

import { Aviso } from './Aviso';
import estilos from './CampoDeFoto.module.css';
import { useUploadDireto } from './useUploadDireto';

export type TextosDoCampoDeFoto = {
  /** Rótulo do botão — "Adicionar foto" ou "Trocar foto", conforme a tela. */
  readonly botao: string;
  /** A dica em repouso: "JPG ou PNG, a partir de 400×400." */
  readonly hint: string;
  readonly enviando: string;
  readonly enviada: string;
  readonly erroTipo: string;
  readonly erroTamanho: string;
};

/** `sm` é a base do módulo CSS, e por isso não tem classe própria. */
const CLASSE_DO_TAMANHO: Record<'sm' | 'md' | 'lg', string | undefined> = {
  sm: undefined,
  md: estilos.avatarMd,
  lg: estilos.avatarLg,
};

export type PropsCampoDeFoto = {
  /** Para as iniciais do avatar enquanto não há imagem. */
  readonly nome: string;
  /** URL pública da foto atual, quando já existe uma. */
  readonly fotoUrl?: string | null;
  /** O caminho já gravado no perfil — muda a dica de "nenhuma" para "enviada". */
  readonly caminhoAtual?: string | null;
  /**
   * Avisa quando um upload começa e termina.
   *
   * Quem envolve o campo precisa disso para travar o "Continuar": enviar com o
   * upload em curso manda `foto_caminho` vazio, e a foto se perde sem nenhum
   * erro visível.
   */
  readonly aoMudarEnvio?: (subindo: boolean) => void;
  /**
   * Corpo do botão: 14px em 7.1 e 27.1, 13px no passo 1 do wizard.
   *
   * O protótipo usa os dois tamanhos, e a suíte de paridade compara o valor
   * computado — então a diferença precisa existir aqui, e não ser aparada para
   * um número só.
   */
  readonly tamanhoDoBotao?: 'sm' | 'md';
  /**
   * Diâmetro do avatar e corpo das iniciais, um por tela do protótipo:
   * `sm` é o passo 1 do curador (56px/17px), `md` os dados do membro admin
   * (27.1) e `lg` o perfil do artista (7.1), que é o maior. Ver o módulo CSS.
   */
  readonly tamanho?: 'sm' | 'md' | 'lg';
  readonly textos: TextosDoCampoDeFoto;
};

/**
 * Avatar + "Trocar foto" — o bloco que as telas 7.1, 12 e 27.1 repetem.
 *
 * O arquivo sobe **na escolha**, direto ao Storage, e o que viaja no `FormData`
 * é só o caminho (`foto_caminho`). Isso mantém o corpo do formulário longe do
 * teto de ~4,5 MB da Vercel e, no wizard, evita que "Voltar" e "Pular"
 * carreguem o arquivo sem precisar dele — ver `useUploadDireto`.
 *
 * O `name="foto"` do input **fica**: sem JavaScript o `onChange` não roda, e aí
 * o arquivo volta a viajar no `multipart` para a ação validar. É o mesmo
 * desenho do passo 1 do curador, de onde este componente foi extraído.
 */
export function CampoDeFoto({
  nome,
  fotoUrl,
  caminhoAtual,
  aoMudarEnvio,
  tamanhoDoBotao = 'md',
  tamanho = 'sm',
  textos,
}: PropsCampoDeFoto) {
  const foto = useUploadDireto({
    balde: 'avatares',
    nomeBase: 'perfil',
    tipos: FOTO_TIPOS,
    maxBytes: FOTO_MAX_BYTES,
    mensagens: { tipo: textos.erroTipo, tamanho: textos.erroTamanho },
  });

  const subindo = foto.subindo;
  useEffect(() => {
    aoMudarEnvio?.(subindo);
  }, [aoMudarEnvio, subindo]);

  return (
    <div className={estilos.envolvente}>
      {/*
        A recusa do upload vai num `Aviso`, e não só na dica: `Aviso tom="erro"`
        é `role="alert"`, e a dica é `role="status"` — um leitor de tela não
        seria interrompido por um arquivo recusado, e a pessoa seguiria achando
        que a foto subiu. Era assim no passo 1 do wizard antes desta extração.
      */}
      {foto.erro === undefined ? null : <Aviso tom="erro">{foto.erro}</Aviso>}

      <div className={estilos.base}>
        {fotoUrl != null && fotoUrl !== '' ? (
          // `<img>` e não `next/image`: a origem é o bucket público do Supabase,
          // e passar por `remotePatterns` só para um avatar de 56px não paga.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={[estilos.avatarImagem, CLASSE_DO_TAMANHO[tamanho]].filter(Boolean).join(' ')}
            src={fotoUrl}
            alt=""
          />
        ) : (
          <span
            className={[estilos.avatar, CLASSE_DO_TAMANHO[tamanho]].filter(Boolean).join(' ')}
            aria-hidden="true"
          >
            {iniciaisDe(nome)}
          </span>
        )}

        <div className={estilos.textos}>
          {/* `<label>` envolvendo o input: alvo de clique do tamanho do botão,
            sem `onClick` nem `ref`. */}
          <label
            className={[estilos.botao, tamanhoDoBotao === 'sm' ? estilos.botaoSm : undefined]
              .filter(Boolean)
              .join(' ')}
          >
            {textos.botao}
            <input
              type="file"
              name="foto"
              accept={FOTO_TIPOS.join(',')}
              className={estilos.arquivo}
              onChange={foto.aoEscolher}
            />
          </label>

          <input type="hidden" name="foto_caminho" value={foto.caminho} />

          <span className={estilos.hint} aria-live="polite">
            {foto.subindo
              ? textos.enviando
              : (foto.nome ?? ((caminhoAtual ?? '') === '' ? textos.hint : textos.enviada))}
          </span>
        </div>
      </div>
    </div>
  );
}
