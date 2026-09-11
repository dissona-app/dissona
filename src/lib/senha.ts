/**
 * Política de senha e medidor de força.
 *
 * Duas coisas diferentes, e confundi-las é o erro comum:
 *
 *  - **A política** é o que barra o envio: 8 caracteres ou mais, com ao menos
 *    um número (architecture.md §5.3, decidida pelo protótipo da R2). É binária.
 *  - **A força** é só retorno visual, de 0 a 3. Uma senha "fraca" pelo medidor
 *    pode perfeitamente atender à política e ser aceita — o medidor informa,
 *    não decide.
 *
 * As duas moram aqui, e não no componente, porque o Zod do cadastro e da
 * redefinição precisam da primeira e o `MedidorDeSenha` precisa da segunda.
 * Duas implementações da mesma regra divergiriam, e a divergência apareceria
 * como um formulário que mostra "Senha forte" e recusa o envio.
 *
 * Os números não vêm de `configuracao`: política de credencial é da mesma
 * categoria dos prazos de token (60 minutos, 24 horas), que vivem na
 * configuração do Auth e não na tabela de thresholds de negócio.
 */

export const SENHA_MIN_CARACTERES = 8;

const TEM_DIGITO = /\d/;
const TEM_SIMBOLO = /[^A-Za-z0-9]/;
const TEM_MINUSCULA = /[a-z]/;
const TEM_MAIUSCULA = /[A-Z]/;

/** Os dois requisitos que a tela lista com *dot*, na ordem em que ela lista. */
export function senhaTemTamanho(senha: string): boolean {
  return senha.length >= SENHA_MIN_CARACTERES;
}

export function senhaTemNumero(senha: string): boolean {
  return TEM_DIGITO.test(senha);
}

export function senhaAtendePolitica(senha: string): boolean {
  return senhaTemTamanho(senha) && senhaTemNumero(senha);
}

export type NivelDeForca = 0 | 1 | 2 | 3;

/**
 * Força de 0 a 3, no algoritmo do protótipo (`strength()`).
 *
 * Um ponto por tamanho, um por número, um por "variedade" — símbolo, ou
 * maiúscula e minúscula juntas. O `Math.max(1, …)` é do protótipo e é o que
 * garante que qualquer senha digitada mostre pelo menos uma barra: só a senha
 * **vazia** é nível 0, que é o estado "Mínimo 8 com número".
 */
export function forcaDaSenha(senha: string): NivelDeForca {
  if (senha === '') return 0;

  let pontos = 0;
  if (senhaTemTamanho(senha)) pontos += 1;
  if (senhaTemNumero(senha)) pontos += 1;
  if (TEM_SIMBOLO.test(senha) || (TEM_MINUSCULA.test(senha) && TEM_MAIUSCULA.test(senha))) {
    pontos += 1;
  }

  return Math.max(1, pontos) as NivelDeForca;
}
