import { Marca } from '@/componentes/base/Marca';
import { CURADOR_CADASTRO } from '@/textos/curador';

import estilos from './PainelDeMarca.module.css';

/**
 * Painel de marca do split-screen do passo 1 — `docs/R2/extraido/Curador.html`.
 *
 * O único texto do wizard que existe **duas vezes** no produto: no passo 1 do
 * wizard (`(app)/(cadastro)/curador/cadastro/[passo]`, sessão já existe) e na
 * tela de criar conta do curador (`(auth)/curador/cadastrar`, sessão ainda
 * não existe — RF-006). É a mesma frase nos dois lados porque o protótipo é a
 * mesma tela nos dois estados (`cHerdado`), então o componente é um só,
 * extraído para não divergir por cópia.
 *
 * O logotipo não é link aqui — no protótipo é uma `<img>` solta, sem `<a>` em
 * volta, 36px de altura fixa, alinhada ao início do painel. Nas telas de auth
 * (`MolduraDeAutenticacao`) ele é link para a home; aqui não, porque as duas
 * telas onde este painel aparece podem estar no meio de um cadastro — sair
 * pela marca no meio de oito passos perderia o progresso sem aviso.
 */
export function PainelDeMarca() {
  return (
    <>
      <Marca variante="colorida" altura="36px" className={estilos.marca} />
      {/* `<h2>`: o `<h1>` da página é o título do passo, na moldura. */}
      <h2 className={estilos.titulo}>{CURADOR_CADASTRO.asideTitulo}</h2>
      <p className={estilos.texto}>{CURADOR_CADASTRO.asideTexto}</p>
    </>
  );
}
