import { clienteDeServico } from './banco';
import { DOMINIO_E2E, senhaDeTeste } from './personas';

/**
 * Contas descartáveis, para os cenários que **consomem** o estado que provam.
 *
 * ## Por que as personas fixas não servem
 *
 * Escolher um perfil dá um papel à conta, para sempre. Concluir o onboarding
 * grava `onboarding_visto_em`. Excluir a conta a desativa. São estados de ida
 * só: usar `SEM_PAPEL` para provar a seleção de perfil a deixaria **com** papel,
 * e o segundo teste a rodar — ou a próxima execução da suíte — encontraria um
 * mundo diferente do que o cabeçalho dela promete.
 *
 * Repor por seed também não resolve: o estado só voltaria entre execuções, e
 * `fullyParallel` não garante que dois testes não peguem a mesma conta dentro
 * da mesma execução.
 *
 * ## O prefixo é a rede de segurança
 *
 * `e2e_ef_` é **próprio**, e nunca casa com as personas fixas (`e2e_admin`,
 * `e2e_artista`, …). Toda varredura por conta descartável filtra por ele, então
 * nenhum engano de filtro alcança uma persona.
 *
 * ## Por que `admin.createUser`, e não a tela de cadastro
 *
 * O `signUp` do GoTrue **recusa** `@e2e.dissona.local` — domínio sem MX, erro
 * `email_address_invalid` (a razão está em `src/modulos/autenticacao/repositorio.ts`).
 * A API de admin não passa por essa validação, então as contas descartáveis
 * continuam no namespace não roteável, de onde nenhum e-mail sai por acidente.
 *
 * O cenário que precisa exercer **a tela** de cadastro é outro: esse usa um
 * domínio real, e é o único que envia e-mail.
 */

export type ContaEfemera = {
  readonly id: string;
  readonly email: string;
  readonly nome: string;
};

export const PREFIXO_EFEMERO = 'e2e_ef_';

/**
 * E-mail único por worker e por execução.
 *
 * O carimbo sozinho não basta: dois workers começam no mesmo milissegundo com
 * frequência desconfortável, e o resultado seria uma conta roubando a do outro.
 */
function emailEfemero(rotulo: string, indiceDoWorker: number): string {
  const carimbo = Date.now().toString(36);
  return `${PREFIXO_EFEMERO}${rotulo}_${indiceDoWorker}_${carimbo}@${DOMINIO_E2E}`;
}

export type OpcoesDaConta = {
  readonly rotulo: string;
  readonly indiceDoWorker: number;
  /** `artista`, `curador`, ou nenhum — que é o estado da seleção de perfil. */
  readonly papeis?: readonly ('artista' | 'curador')[];
  /** `false` deixa o tour pendente, que é o estado do onboarding. */
  readonly onboardingVisto?: boolean;
  /**
   * `false` deixa o e-mail pendente, que é o estado de RF-004.
   *
   * Tem de ser decidido **no nascimento**: `updateUserById({ email_confirm:
   * false })` não desconfirma nada — a flag só serve para confirmar, e passá-la
   * como `false` é silenciosamente inócuo. Descobrir isso custou um
   * `generateLink` recusando com "already been registered", que é uma mensagem
   * sobre outra coisa.
   */
  readonly emailConfirmado?: boolean;
};

/**
 * Cria a conta e devolve o que o teste precisa para entrar com ela.
 *
 * A senha é a mesma `E2E_SENHA` das personas fixas: uma senha por conta seria
 * um segredo a mais para gerenciar, sem proteger nada — estas contas vivem
 * minutos e são apagadas pelo próprio teste.
 */
export async function criarContaEfemera(opcoes: OpcoesDaConta): Promise<ContaEfemera> {
  const supabase = clienteDeServico();
  const email = emailEfemero(opcoes.rotulo, opcoes.indiceDoWorker);
  const nome = `E2E Efêmera ${opcoes.rotulo}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senhaDeTeste(),
    email_confirm: opcoes.emailConfirmado ?? true,
    // `aceite_termos` no metadado é o que o trigger `criar_perfil_para_novo_usuario`
    // lê; sem ele a guarda devolve a conta para `/cadastrar/confirmar` em toda
    // rota, e o cenário nunca sai do lugar.
    user_metadata: { nome_completo: nome, aceite_termos: 'true' },
  });

  if (error !== null) throw new Error(`criar conta efêmera "${email}": ${error.message}`);
  const id = data.user.id;

  for (const papel of opcoes.papeis ?? []) {
    const { error: erroDoPapel } = await supabase
      .from('papel_usuario')
      .insert({ perfil_id: id, papel });
    if (erroDoPapel !== null) {
      throw new Error(`dar o papel "${papel}" a ${email}: ${erroDoPapel.message}`);
    }

    if (papel === 'artista') {
      const { error: erroDoPerfil } = await supabase
        .from('perfil_artista')
        .insert({ perfil_id: id });
      if (erroDoPerfil !== null) {
        throw new Error(`criar perfil_artista de ${email}: ${erroDoPerfil.message}`);
      }
    }
  }

  // O padrão é **onboarding pendente**, que é o estado de quem acabou de
  // escolher o perfil. Quem quer a conta assentada pede explicitamente.
  if (opcoes.onboardingVisto === true) {
    const { error: erroDoOnboarding } = await supabase
      .from('perfil')
      .update({ onboarding_visto_em: new Date().toISOString() })
      .eq('id', id);
    if (erroDoOnboarding !== null) {
      throw new Error(`marcar o onboarding de ${email}: ${erroDoOnboarding.message}`);
    }
  }

  return { id, email, nome };
}

/**
 * Apaga a conta descartável.
 *
 * Chamado no `afterAll` do próprio cenário — quem cria, apaga. Falha em silêncio
 * porque limpeza que quebra a suíte é pior que lixo: o teste já passou ou já
 * falhou, e o diagnóstico dele não pode virar "erro ao apagar conta".
 * A varredura por idade é a rede de segurança para o que escapar.
 */
export async function apagarContaEfemera(conta: ContaEfemera): Promise<void> {
  try {
    await clienteDeServico().auth.admin.deleteUser(conta.id);
  } catch {
    // Silêncio deliberado — ver acima.
  }
}

/**
 * Varre as contas descartáveis abandonadas.
 *
 * A janela de idade é o que torna isto seguro com `fullyParallel`: uma conta
 * criada há segundos pode estar em uso por outro worker **agora**, e apagá-la
 * derrubaria um teste que não tem nada a ver com esta varredura. Uma hora é
 * folga mais que suficiente para o teste mais lento da suíte.
 */
export async function varrerContasEfemeras(idadeMinimaEmMinutos = 60): Promise<number> {
  const supabase = clienteDeServico();
  const limite = Date.now() - idadeMinimaEmMinutos * 60_000;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (error !== null) throw new Error(`listar contas para varredura: ${error.message}`);

  let apagadas = 0;
  for (const usuario of data.users) {
    const email = usuario.email ?? '';
    if (!email.startsWith(PREFIXO_EFEMERO)) continue;
    if (new Date(usuario.created_at).getTime() > limite) continue;

    await supabase.auth.admin.deleteUser(usuario.id);
    apagadas += 1;
  }
  return apagadas;
}
