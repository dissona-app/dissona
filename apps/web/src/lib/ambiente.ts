/**
 * Leitura das variáveis de ambiente, com falha explícita.
 *
 * Falta de variável tem de estourar no boot com o nome da chave, e não virar
 * um `undefined` que só aparece como erro de rede três camadas depois.
 */

function obrigatoria(nome: string, valor: string | undefined): string {
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env.local, ` +
        'ou configure o escopo correspondente na Vercel (ver README.md).',
    );
  }
  return valor;
}

export const ambiente = {
  supabase: {
    get url(): string {
      return obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    },
    get chavePublica(): string {
      return obrigatoria(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      );
    },
    /**
     * Chave de serviço — ignora RLS. **Nunca** `NEXT_PUBLIC_`.
     *
     * Getter, e não constante, para a ausência estourar só quando alguém tenta
     * usá-la: a maior parte da aplicação não precisa dela, e um `throw` no boot
     * derrubaria o app inteiro por causa de um caminho que ninguém percorreu.
     */
    get chaveDeServico(): string {
      return obrigatoria('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    },
  },
} as const;

/**
 * O login por SoundCloud está ligado?
 *
 * **Ligado por padrão**, e desligado só por `SOUNDCLOUD_LIGADO=false`. A
 * inversão é deliberada: não há credencial nossa a ler — o `client_id` e o
 * segredo vivem no provider `custom:soundcloud`, que é do **projeto** Supabase,
 * e Preview e Production compartilham o mesmo projeto. Ou seja, onde o app
 * roda, o provider existe.
 *
 * Como opt-in, um deploy sem a variável mostraria o botão desabilitado sem
 * nenhum motivo real, e quem fosse investigar procuraria o defeito no lugar
 * errado. O que sobra para a flag é o papel de chave de emergência: se a API
 * deles cair ou a assinatura expirar, `false` tira o botão do caminho sem
 * exigir deploy de código.
 *
 * Sem prefixo `NEXT_PUBLIC_`: quem decide é o servidor, e quem lê é Server
 * Component.
 */
export function soundcloudLigado(): boolean {
  return process.env.SOUNDCLOUD_LIGADO !== 'false';
}

/**
 * A chave de serviço está configurada?
 *
 * Existe para o que **degrada** em vez de falhar. O caso concreto é a
 * notificação: gravar o alerta de "novo cadastro" para o admin passa pela
 * service role, e não gravá-lo não é razão para o cadastro da pessoa falhar.
 * Quem precisa dela de verdade — o painel de sessões ativas, o convite de
 * admin — chama `chaveDeServico` direto e estoura com o nome da variável.
 */
export function temChaveDeServico(): boolean {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return chave !== undefined && chave.trim() !== '';
}

/**
 * O checkout (5.2) roda com o provedor **simulado**?
 *
 * Ligado por padrão, e desligado por `PAGAMENTO_SIMULADO=false` — a mesma
 * inversão de `soundcloudLigado`. O padrão é o simulador porque um ambiente
 * sem credencial do Asaas é o caso comum (um clone recém-feito, um Preview),
 * e um opt-in deixaria a tela morta sem motivo visível.
 *
 * **O Asaas existe e está implementado**: `modulos/claves/asaas.ts` faz Pix com
 * QR code e cartão, e `/api/webhooks/asaas` confirma e recusa o pedido. Com
 * `false` e `ASAAS_API_KEY` presente, é ele que roda; com `false` e sem chave,
 * a ação falha com `PAGAMENTO_INDISPONIVEL` em vez de creditar de graça. O que
 * segue bloqueado por [#6](../../docs/open-questions.md) é o **repasse ao
 * curador** — split, subconta e KYC —, que é decisão de contador.
 *
 * ⚠️ **Enquanto isto devolver `true`, a compra credita Claves sem cobrança
 * nenhuma.** É o que o próprio protótipo da R2 desenha — ele tem o controle
 * "Simular resultado · Aprovado / Recusado" na tela, e a nota "Pagamento
 * simulado. Nenhuma cobrança é feita" —, e a tela repete essa nota para quem
 * está olhando. **Em produção, `PAGAMENTO_SIMULADO=false` não é opcional.**
 */
export function pagamentoSimulado(): boolean {
  return process.env.PAGAMENTO_SIMULADO !== 'false';
}

/**
 * O admin mora em `admin.<domínio>`?
 *
 * **Desligado por padrão**, e ligado por `ADMIN_EM_SUBDOMINIO=true` — ao
 * contrário de `soundcloudLigado`, porque o subdomínio depende de DNS e de
 * domínio na Vercel: ligado onde ele não existe (um Preview, cujo domínio por
 * branch não tem `admin.`), o `/admin` redirecionaria para um endereço que não
 * resolve. Desligado, o admin segue servido em `/admin/...` — e quem abrir o
 * subdomínio diretamente é atendido do mesmo jeito, porque o modo é decidido
 * pelo host (`lib/rotas-admin.ts`).
 *
 * O que a flag decide é só uma coisa: se o host principal **manda** o `/admin`
 * para `admin.`.
 */
export function adminEmSubdominio(): boolean {
  return process.env.ADMIN_EM_SUBDOMINIO === 'true';
}
