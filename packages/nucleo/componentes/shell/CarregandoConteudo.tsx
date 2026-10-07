import estilos from './CarregandoConteudo.module.css';

/**
 * O que aparece na área de conteúdo enquanto a rota seguinte carrega — o
 * `loading.tsx` de cada ambiente (artista, curador, painel admin).
 *
 * Existe porque as rotas autenticadas são dinâmicas: sem um `loading.tsx` o
 * Next espera a resposta inteira do servidor antes de trocar de tela, e o
 * clique no menu parecia não ter feito nada. Com ele a navegação é imediata —
 * o shell (sidebar e header) fica, e o miolo mostra este esqueleto.
 *
 * Esqueleto neutro de propósito: título, uma linha de apoio e três blocos. Não
 * imita uma tela específica, porque ele serve a todas e uma silhueta errada
 * engana mais do que uma genérica.
 */
export function CarregandoConteudo() {
  return (
    <div className={estilos.base} role="status" aria-live="polite" aria-busy="true">
      <span className="dsn-apenas-leitor">Carregando…</span>
      <div className={estilos.titulo} aria-hidden="true" />
      <div className={estilos.linha} aria-hidden="true" />
      <div className={estilos.blocos} aria-hidden="true">
        <div className={estilos.bloco} />
        <div className={estilos.bloco} />
        <div className={estilos.bloco} />
      </div>
    </div>
  );
}
