'use client';

import { useState } from 'react';

import { criarClienteNavegador } from '@/lib/supabase/cliente';
import { conferirArquivo, extensaoDoMime } from '@/modulos/curador/esquemas';
import { ERRO_GERAL } from '@/textos/erros';

export type MensagensDoUpload = {
  readonly tipo: string;
  readonly tamanho: string;
};

export type OpcoesDoUploadDireto = {
  readonly balde: 'avatares' | 'materiais';
  readonly nomeBase: 'perfil' | 'formacao';
  readonly tipos: readonly string[];
  readonly maxBytes: number;
  readonly mensagens: MensagensDoUpload;
};

export type EstadoDoUploadDireto = {
  /** Vai direto no `onChange` do `<input type="file">`. */
  readonly aoEscolher: (evento: React.ChangeEvent<HTMLInputElement>) => void;
  /** O caminho já gravado no bucket, para o `<input type="hidden">`. */
  readonly caminho: string;
  /** Nome do arquivo escolhido, para a tela dizer o que foi anexado. */
  readonly nome: string | null;
  readonly subindo: boolean;
  readonly erro: string | undefined;
};

/**
 * Sobe o arquivo do wizard direto ao Storage, no momento da escolha.
 *
 * ## Por que no `onChange`, e não no envio do formulário
 *
 * "Voltar", "Pular" e "Continuar" são `type="submit"` do **mesmo** `<form>`, e
 * os dois primeiros trocam o destino com `formAction` — que **substitui** o
 * `action` do formulário. Um embrulho de upload no `<form action>`, que é o
 * desenho do `FormularioDaFaixa`, não cobriria os dois: eles continuariam
 * carregando os 5 MB do anexo escolhido para o servidor, sem precisar dele, e
 * continuariam batendo no teto de ~4,5 MB da Vercel.
 *
 * Subindo na escolha, o arquivo sai do formulário antes de qualquer clique: o
 * `value` do `<input>` é limpo e o que viaja é o caminho. Nenhum dos três botões
 * carrega bytes.
 *
 * ## A conferência no cliente não é uma segunda regra
 *
 * `conferirArquivo` é a **mesma** função pura que o servidor chama, com as
 * mesmas constantes de `curador/esquemas.ts` — uma fonte, avaliada em dois
 * lugares. Ela existe porque aqui, ao contrário do bucket `faixas`, **o bucket é
 * mais frouxo que a aplicação**: `materiais` aceita 20 MB e `docx`, `avatares`
 * aceita `webp`. Sem esta conferência, um arquivo que a aplicação vai recusar
 * sobe assim mesmo e, com `upsert: true` num nome fixo, **sobrescreve o arquivo
 * válido que já estava lá** — e só depois a ação o recusa.
 *
 * O servidor continua sendo a autoridade: ele revalida pelo metadado do objeto.
 *
 * ## Falhar não pode custar o caminho de baixo
 *
 * Quando o upload falha, o `value` do `<input>` **não** é limpo. A mensagem
 * aparece, e o arquivo continua no formulário — então o envio seguinte volta a
 * ser o `multipart` de sempre, que o servidor sabe validar. É a mesma garantia
 * do `FormularioDaFaixa`: os dois caminhos existem, e o de baixo é o que faz a
 * tela funcionar sem hidratação.
 */
export function useUploadDireto({
  balde,
  nomeBase,
  tipos,
  maxBytes,
  mensagens,
}: OpcoesDoUploadDireto): EstadoDoUploadDireto {
  const [caminho, setCaminho] = useState('');
  const [nome, setNome] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | undefined>(undefined);

  const aoEscolher = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const entrada = evento.currentTarget;
    const escolhido = entrada.files?.[0] ?? null;

    setErro(undefined);
    setCaminho('');
    setNome(escolhido?.name ?? null);
    if (escolhido === null) return;

    const conferido = conferirArquivo(escolhido, tipos, maxBytes);
    if (!conferido.ok) {
      setErro(mensagens[conferido.motivo]);
      return;
    }

    void (async () => {
      setSubindo(true);
      try {
        const supabase = criarClienteNavegador();
        const { data: sessao } = await supabase.auth.getUser();
        const usuarioId = sessao.user?.id;

        // Sem sessão legível daqui, deixa o arquivo no formulário: a ação tem a
        // resposta certa para isso (`NAO_AUTENTICADO`), e adivinhá-la no cliente
        // daria duas versões da mesma regra.
        if (usuarioId === undefined) return;

        const { data, error } = await supabase.storage
          .from(balde)
          .upload(`${usuarioId}/${nomeBase}${extensaoDoMime(escolhido.type)}`, escolhido, {
            upsert: true,
            contentType: escolhido.type,
          });

        if (error !== null || data === null) {
          setErro(ERRO_GERAL);
          return;
        }

        setCaminho(data.path);
        // Só agora o arquivo sai do formulário. Antes disto, ele é a retaguarda.
        entrada.value = '';
      } finally {
        setSubindo(false);
      }
    })();
  };

  return { aoEscolher, caminho, nome, subindo, erro };
}
