/**
 * Os ícones do menu lateral — traços literais do protótipo aprovado
 * (`docs/prototipo-aprovado/*.html`), 17px, `stroke-width` 1.7 (1.6 no item
 * ativo), em `currentColor`.
 */

export type NomeDoIcone =
  | 'inicio'
  | 'enviar'
  | 'faixas'
  | 'curadores'
  | 'perfil'
  | 'carteira'
  | 'configuracoes'
  | 'fila'
  | 'notas'
  | 'metricas'
  | 'meuPerfil'
  | 'usuarios'
  | 'pacotes'
  | 'moderacao'
  | 'recolher';

const TRACOS: Readonly<Record<NomeDoIcone, React.ReactNode>> = {
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  enviar: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </>
  ),
  faixas: (
    <>
      <path d="M5 15V9" />
      <path d="M10 19V5" />
      <path d="M15 17V7" />
      <path d="M20 14v-4" />
    </>
  ),
  curadores: (
    <>
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M4.6 11.4a7.4 7.4 0 0 1 14.8 0" />
      <path d="M4.6 11.4v2.4a1.7 1.7 0 0 0 1.7 1.7h.7v-5.8h-.7a1.7 1.7 0 0 0-1.7 1.7z" />
      <path d="M19.4 11.4v2.4a1.7 1.7 0 0 1-1.7 1.7H17v-5.8h.7a1.7 1.7 0 0 1 1.7 1.7z" />
      <path d="M6.6 18.2A7.2 7.2 0 0 1 12 16a7.2 7.2 0 0 1 5.4 2.2" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20c0-3.7 3.2-6.6 7.2-6.6s7.2 2.9 7.2 6.6" />
    </>
  ),
  carteira: (
    <>
      <path d="M3 8.5h18v10H3z" />
      <path d="M3 8.5 15 4l3 4.5" />
      <circle cx="17" cy="13.5" r="1.4" />
    </>
  ),
  configuracoes: (
    <>
      <path d="M10.6 3h2.8l.42 2.34 1.7.98 2.2-.86 1.4 2.42-1.78 1.56v1.96l1.78 1.56-1.4 2.42-2.2-.86-1.7.98L13.4 21h-2.8l-.42-2.34-1.7-.98-2.2.86-1.4-2.42 1.78-1.56v-1.96L4.88 7.88l1.4-2.42 2.2.86 1.7-.98z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  fila: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h11" />
      <path d="M4 17h7" />
      <circle cx="19" cy="16.5" r="2.5" />
    </>
  ),
  notas: (
    <>
      <path d="M4 5.5h13" />
      <path d="M4 10.5h9" />
      <path d="M4 15.5h6" />
      <path d="m15.5 19.5 5-5-2-2-5 5-.6 2.6z" />
    </>
  ),
  metricas: (
    <>
      <path d="M4 19V9" />
      <path d="M9.5 19V5" />
      <path d="M15 19v-7" />
      <path d="M20.5 19V8" />
    </>
  ),
  meuPerfil: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8.4" r="3.3" />
      <path d="M3.4 19.4c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6" />
      <path d="M16.4 5.6a3.1 3.1 0 0 1 0 5.9" />
      <path d="M17.6 14.2c1.8.8 3 2.5 3 4.5" />
    </>
  ),
  pacotes: (
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" />
      <path d="m4 8.5 8 4.5 8-4.5" />
      <path d="M12 13v7" />
    </>
  ),
  moderacao: (
    <>
      <path d="M12 3.5 5 6v6c0 4 3 7 7 8.5 4-1.5 7-4.5 7-8.5V6z" />
      <path d="M12 8.6v4" />
      <path d="M12 15.6h.01" />
    </>
  ),
  recolher: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 4.5v15" />
      <path d="m15.5 10-2 2 2 2" />
    </>
  ),
};

export function IconeDeNavegacao({
  nome,
  ativo = false,
}: {
  readonly nome: NomeDoIcone;
  readonly ativo?: boolean;
}) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ativo ? 1.6 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: '0 0 auto' }}
    >
      {TRACOS[nome]}
    </svg>
  );
}
