/**
 * Duas iniciais a partir do nome — o `initials` dos protótipos.
 *
 * Aparece no avatar do wizard do curador, no do membro admin, na vitrine do
 * perfil do artista e na lista da equipe. Estava duplicada em dois
 * componentes, com a mesma regra escrita duas vezes.
 *
 * `DS` é o recuo para nome vazio: um avatar em branco parece falha de
 * carregamento, e a marca é uma resposta melhor que um buraco.
 */
export function iniciaisDe(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
