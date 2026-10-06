/**
 * O olho do botão "mostrar senha".
 *
 * Saiu de dentro do `FormularioDeLogin` quando o segundo formulário com campo
 * de senha apareceu. São cinco telas ao todo — login, login admin, cadastro,
 * redefinição e as duas trocas de credencial em Conta —, e um `<path>`
 * duplicado cinco vezes é um `<path>` que vai divergir.
 *
 * `aria-hidden`: quem descreve o botão é o `aria-label` dele, que alterna entre
 * "Mostrar senha" e "Ocultar senha". O ícone repetido só faria o leitor de tela
 * anunciar duas vezes.
 */
export function IconeOlho({ riscado }: { readonly riscado: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.6" />
      {riscado ? <path d="m4 20 16-16" /> : null}
    </svg>
  );
}
