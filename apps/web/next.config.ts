import type { NextConfig } from 'next';

/**
 * O que ainda viaja no corpo de uma Server Action.
 *
 * Quase nada, hoje. Os três arquivos que o produto recebe de um
 * `<input type="file">` — o áudio da faixa (RF-036), a foto do curador e o
 * anexo de credencial — vão do navegador **direto ao Supabase Storage**, e a
 * Server Action recebe só o caminho. Era o que faltava para o envio sobreviver
 * ao deploy: uma função serverless da Vercel aceita ~4,5 MB de corpo de request,
 * e nenhuma opção daqui levanta esse teto.
 *
 * Estes números cobrem, então, o **caminho sem JavaScript**: sem hidratação o
 * `onChange` não roda, o arquivo volta ao `multipart` e o servidor o valida como
 * sempre. O maior deles é o anexo de credencial, 5 MB
 * (`src/modulos/curador/esquemas.ts`).
 *
 * Os dois limites são distintos e falham de formas diferentes, o que custou um
 * 500 sem explicação para descobrir:
 *
 * 1. **`serverActions.bodySizeLimit`**, default **1 MB**. Acima disso o Next
 *    recusa no boundary, com "Body exceeded 1mb limit", antes de a validação
 *    rodar.
 * 2. **`proxyClientMaxBodySize`**, default **10 MB**, e ele se aplica porque
 *    `src/middleware.ts` casa com as rotas do envio. Acima disso o Next
 *    **trunca** o corpo em vez de recusá-lo: a pessoa vê "A server error
 *    occurred" e o log diz `Error: Unexpected end of form`, que não sugere
 *    tamanho de arquivo.
 *
 * Estes números **não são regra de negócio** — são limites de transporte, e por
 * isso vivem aqui em vez de na tabela `configuracao`. Quem recusa por tamanho
 * continua sendo a aplicação: `validarAudio`/`validarAudioNoStorage` no envio,
 * `conferirArquivo`/`conferirObjeto` no cadastro do curador.
 *
 * ⚠️ **Sem JavaScript, o anexo de 5 MB continua morrendo no teto da Vercel.** O
 * caminho degradado sobrevive até ~4,5 MB e não há como não ser, a não ser com
 * um endpoint de upload próprio. Com JavaScript — que é o caso de quem usa o
 * produto — o corpo é um path e o teto deixou de importar.
 */
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    proxyClientMaxBodySize: '8mb',
  },
};

export default nextConfig;
