# Design System — Dissona

**Fonte de verdade:** protótipos navegáveis do **Release 2** em [docs/R2/](R2/):

- `Dissona - Ambiente Artista - Release 2.html`
- `Dissona - Ambiente Curador - Release 2.html`
- `Dissona - Ambiente Admin - Release 2.html`

**Método de extração:** os três arquivos são páginas empacotadas (`__bundler/template` + manifest de assets gzip). Os valores abaixo foram extraídos do template HTML de cada ambiente — todo o estilo é inline (`style`, `style-hover`, `style-focus`, `style-active`), mais um bloco `<style>` global no `<helmet>` e o script de estado (`type="text/x-dc"`) que resolve as cores condicionais (`{{ submitBg }}`, `{{ nav0Fg }}`, etc.).

**Consequência importante:** o protótipo **não usa CSS custom properties**. Os nomes de token neste documento (`--dsn-*`) são a nomenclatura proposta para a implementação; os **valores** são os literais medidos no protótipo. Onde o protótipo não decide algo (breakpoints móveis, reduced-motion), o item está marcado como pendência e não como valor.

---

## 1. Fundamentos e tokens

### 1.1 Cor — primitivos

Frequência = número de ocorrências somadas nos três ambientes; serve para separar token de valor pontual.

#### Roxo (marca / identidade)

| Token | Hex | Freq. | Uso observado |
|---|---|---:|---|
| `--dsn-purple-900` | `#1B0D2A` | 3 | Base do gradiente da sidebar (100%) |
| `--dsn-purple-850` | `#241239` | 3 | Meio do gradiente da sidebar (52%) |
| `--dsn-purple-800` | `#2D1747` | 3 | Topo do gradiente da sidebar (0%) |
| `--dsn-purple-600` | `#5B2E8F` | 404 | **Roxo primário**: links, rótulos de destaque, borda de botão secundário, seleção ativa, avatar |
| `--dsn-purple-500` | `#7F47DD` | 315 | **Roxo interativo**: foco de campo, item de nav ativo, hover de link, thumb de slider, checkbox marcado |
| `--dsn-purple-400` | `#8A4FE3` | 5 | Início do gradiente de capa/logo |
| `--dsn-purple-300` | `#B79BE4` | 5 | Passo concluído (stepper), barra de prazo folgado |
| `--dsn-purple-200` | `#D9C7F3` / `#D3C7E8` | 5 / 3 | Borda tracejada de dropzone |
| `--dsn-purple-100` | `#F1EAFB` | 33 | Fundo de badge informativo, avatar em tabela |
| `--dsn-purple-050` | `#F6F3FB` | 129 | **Superfície roxa**: hover de item de menu, fundo de segmented control, avatar do topbar |
| `--dsn-purple-025` | `#FDFCFF` → `#F1ECFA` | 21 / 21 | Extremos do gradiente de fundo das telas de autenticação |

#### Laranja (ação / CTA)

| Token | Hex | Freq. | Uso observado |
|---|---|---:|---|
| `--dsn-orange-500` | `#E35336` | 161 | **Ação primária**: fundo do botão primário, botão de play, fim dos gradientes de marca |
| `--dsn-orange-600` | `#C4442A` | 53 | Hover do botão primário |
| `--dsn-orange-700` | `#A93A22` | 48 | Active/pressed do botão primário |
| `--dsn-orange-300` | `#EFB6A9` | 33 | **Botão primário em loading** (ver ressalva de contraste em 4.2) |
| `--dsn-orange-800` | `#8C3A2C` | 136 | **Texto de erro** e borda de campo inválido |
| `--dsn-orange-650` | `#C0472F` | 13 | Barra de prazo vencido (fila do curador) |
| `--dsn-orange-100` | `#FBEDEA` / `#FDECE8` | 17 / 3 | Fundo de banner e badge de erro |
| `--dsn-orange-200` | `#EBD2CD` / `#F3C6BA` | 15 / — | Borda de banner/card de erro |
| `--dsn-orange-050` | `#FDF8F7` | 4 | Fundo de card em estado de erro |

#### Neutros

| Token | Hex | Freq. | Uso observado |
|---|---|---:|---|
| `--dsn-ink` | `#1B1226` | 156 | Texto primário (`body { color }`), fundo do toast |
| `--dsn-ink-700` | `#4A4553` | 51 | Texto secundário, label de item inativo em segmented |
| `--dsn-ink-500` | `#6B6675` | 429 | **Texto de apoio**: sublegendas, placeholders, overlines de tabela, ícones neutros |
| `--dsn-ink-400` | `#9B93A8` | 10 | Texto desabilitado |
| `--dsn-ink-300` | `#B5AFC0` | 7 | Numeral de stepper inativo, texto placeholder de nota não dada |
| `--dsn-ink-250` | `#C9C3D6` | 17 | Divisores e ícones de baixo peso |
| `--dsn-ink-200` | `#D9D3E6` | 13 | Thumb da scrollbar, meter de senha vazio |
| `--dsn-border` | `#E7E3EF` | 243 | **Borda padrão** de campos, cards, tabelas, divisores |
| `--dsn-border-soft` | `#E2DDEC` | 34 | Borda de textarea/campo secundário |
| `--dsn-border-faint` | `#F1EEF7` | 9 | Divisor entre linhas de tabela |
| `--dsn-track` | `#EEEAF5` | — | Trilha de progress bar e de slider |
| `--dsn-surface` | `#FFFFFF` | 364 | Superfície de card, campo, tabela, modal |
| `--dsn-surface-alt` | `#FBFAFE` / `#FBF9FE` | 9 / 10 | Cabeçalho de tabela, card selecionado |

#### Sidebar (tema escuro)

| Token | Hex | Uso |
|---|---|---|
| `--dsn-nav-fg` | `#FFFFFF` | Item ativo e hover |
| `--dsn-nav-fg-idle` | `#C6BAD9` | Item inativo (`navFg(false)`) |
| `--dsn-nav-overline` | `#9B8CB5` | Título de grupo ("MINHA MÚSICA", "CURADORIA", "CONTA") |
| `--dsn-nav-bg-active` | `#7F47DD` | Fundo do item ativo (`navBg(true)`) |
| `--dsn-nav-bg-hover` | `rgba(255,255,255,0.08)` | Hover de item inativo |
| `--dsn-nav-divider` | `rgba(255,255,255,0.08)` | `border-right` da sidebar e borda do card de saldo |
| `--dsn-nav-card-bg` | `rgba(255,255,255,0.035)` | Fundo do card de saldo na sidebar |

#### Estados semânticos

| Papel | Texto | Fundo | Borda | Ratio (texto/fundo) |
|---|---|---|---|---:|
| Sucesso | `#1E7A4A` · `#1B7A46` | `#E6F5ED` · `#F2FAF5` | `#BFE3CE` | 4.74:1 · 4.76:1 |
| Informativo / neutro-roxo | `#5B2E8F` | `#F1EAFB` | — | 8.02:1 |
| Alerta | `#8A5A12` | `#FDF3E2` · `#FFF6E6` | `#F0DDB6` | 5.38:1 · 5.51:1 |
| Erro | `#8C3A2C` | `#FBEDEA` · `#FDECE8` | `#EBD2CD` · `#F3C6BA` | 6.68:1 · 6.65:1 |
| Neutro | `#4A4553` | `#F1EFF5` | — | 8.12:1 |

Acentos pontuais: `#2FA565` (dot de "senha forte"/status ativo), `#A8761C` (senha média), `#E0A03A` (dot de convite pendente), `#B9B2C6` (dot de desativado).

Cores de terceiros (logos sociais, valor fixo, não tokenizar): `#4285F4` Google, `#1877F2` Facebook, `#FF5500` SoundCloud, `#C13584` Instagram.

#### Logotipo

O protótipo embute a marca como PNG no manifest de assets dos `.html` da R2 — ela **não** é desenhada em CSS, e nenhuma aproximação com gradiente a substitui. `pnpm prototipo:imagens` extrai os três arquivos; o componente é `componentes/base/Marca.tsx`.

| Arquivo | Onde | Medida do protótipo |
|---|---|---|
| `public/marca/dissona-horizontal.png` | telas de autenticação, sobre fundo claro | `height:clamp(28px,3vw,36px)` (artista) · `36px` (curador) · `clamp(44px,5.6vh,60px)` (admin) |
| `public/marca/dissona-horizontal-branco.png` | topo da sidebar, sobre `--dsn-grad-sidebar` | `height:clamp(28px,3.8vh,34px)` — §2.1.1 |
| `public/marca/dissona-simbolo.png` | `<link rel="icon">`; duplicado em `src/app/icon.png` pela convenção do App Router | — |

Em toda aparição o protótipo usa `width:auto; display:block; flex:none` e `alt="Dissona"` — o logotipo é a única aparição do nome na tela, então precisa ser lido. A altura de autenticação está unificada em `clamp(28px,3vw,36px)`, pelo mesmo motivo que o resto da moldura (§3.3).

#### Gradientes de marca

| Token | Valor |
|---|---|
| `--dsn-grad-sidebar` | `linear-gradient(180deg,#2D1747 0%,#241239 52%,#1B0D2A 100%)` |
| `--dsn-grad-auth-bg` | `linear-gradient(180deg,#FDFCFF 0%,#F8F5FD 45%,#F1ECFA 100%)` |
| `--dsn-grad-brand-h` | `linear-gradient(90deg,#5B2E8F,#7F47DD 55%,#E35336)` — barra/accent de 26×3 px, preenchimento de slider |
| `--dsn-grad-brand-diag` | `linear-gradient(145deg,#8A4FE3 0%,#5B2E8F 46%,#E35336 100%)` — capa de faixa sem imagem, avatar sem foto |
| `--dsn-grad-brand-96` | `linear-gradient(96deg,#5B2E8F 0%,#7F47DD 46%,#E35336 100%)` — faixa de destaque do curador |

#### Overlays

| Token | Valor | Uso |
|---|---|---|
| `--dsn-focus-ring` | `rgba(127,71,221,0.16)` | `box-shadow: 0 0 0 3px` no foco de campo (79 ocorrências) |
| `--dsn-focus-ring-slider` | `rgba(127,71,221,0.14)` | `box-shadow: 0 0 0 4px` no thumb do slider e no dropzone em drag |
| `--dsn-backdrop` | `rgba(27,18,38,0.42)` + `backdrop-filter: blur(2px)` | Backdrop de modal |
| `--dsn-topbar-bg` | `rgba(255,255,255,0.9)` + `backdrop-filter: blur(10px)` | Header sticky |
| `--dsn-selection` | `rgba(127,71,221,0.18)` | `::selection` |

---

### 1.2 Tipografia

**Família:** `Inter, system-ui, sans-serif` — Inter carregada localmente via `@font-face` woff2 (7 arquivos, `font-display: swap`, subsets latin/latin-ext/cyrillic/greek/vietnamese). `-webkit-font-smoothing: antialiased` no `body`.

**Pesos em uso:** 400, 500, 600, 700, 800. O peso dominante é **600** (437 ocorrências) — a UI é semibold por padrão, não regular.

#### Escala

| Token | Tamanho | Freq. | Papel |
|---|---|---:|---|
| `--dsn-text-3xl` | `clamp(31px,4.4vh,42px)` | 4 | H1 de tela de marca (hero de autenticação) |
| `--dsn-text-2xl` | `clamp(24px,3.4vh,30px)` | 11 | H1 de tela de fluxo; numeral de KPI |
| `--dsn-text-xl` | `clamp(22px,3vh,27px)` | 7 | H1 de passo de cadastro |
| `--dsn-text-lg` | `24px` | 5 | Título do header do app (`<h1>` do topbar) |
| `--dsn-text-md` | `16px` | 37 | Label de botão primário, título de card de faixa |
| `--dsn-text-base` | `15px` | 196 | **Corpo padrão de campo**: input, textarea, select, tab, título de seção |
| `--dsn-text-sm` | `14px` | 173 | Item de nav, item de menu, botão secundário/ghost, corpo denso |
| `--dsn-text-xs` | `13px` | 182 | Texto de apoio, mensagem de erro inline, célula de tabela, chip |
| `--dsn-text-2xs` | `12px` | 87 | Legenda, nota de rodapé de card |
| `--dsn-text-3xs` | `11px` | 129 | **Label de campo** (uppercase), badge de classe |
| `--dsn-text-4xs` | `10px` | 98 | Overline de grupo de nav, cabeçalho de coluna de tabela, badge de status |

#### Estilos nomeados (composições reais do protótipo)

| Nome | Especificação |
|---|---|
| **Display / H1 hero** | `clamp(31px,4.4vh,42px)` · 800 · `line-height:1.04` · `letter-spacing:-0.035em` · `text-wrap:pretty` |
| **H1 de fluxo** | `clamp(24px,3.4vh,30px)` · 800 · `1.1` · `-0.035em` |
| **H1 de app (topbar)** | `24px` · 700 · `-0.025em` |
| **H2 de seção** | `32px` · 700 · `-0.03em` |
| **Título de card** | `15px` · 600 · `-0.01em` |
| **Corpo** | `15px` · 400 · `line-height:1.55` |
| **Corpo denso** | `13px`–`14px` · 400 · `line-height:1.45`–`1.6` |
| **Label de campo** | `11px` · 600 · `letter-spacing:0.16em` · `text-transform:uppercase` · `#6B6675` |
| **Overline de nav** | `10px` · 600 · `letter-spacing:0.18em` · uppercase · `#9B8CB5` |
| **Cabeçalho de coluna** | `10px` · 600 · `letter-spacing:0.16em` · uppercase · `#6B6675` |
| **Badge / status** | `10px` · 700 · `letter-spacing:0.10em`–`0.12em` · uppercase |
| **Numeral (KPI, saldo, valor)** | 700 · `font-variant-numeric: tabular-nums` · `letter-spacing:-0.01em`–`-0.03em` |
| **Label de botão primário** | `16px` · 600 · `-0.01em` |
| **Label de tab** | `15px` · 600 · `-0.01em` |
| **Item de nav** | `14px` · 500 (inativo) / 600 (ativo) |

`line-height` em uso: `1` · `1.04` · `1.06` · `1.08` · `1.1` · `1.14` · `1.4` · `1.45` · `1.5` · `1.55` · `1.6`. Regra prática do protótipo: quanto maior o texto, menor o `line-height` e mais negativo o `letter-spacing`.

Links globais: `a { color:#5B2E8F; text-decoration:none }` · `a:hover { color:#7F47DD; text-decoration:underline }`.

---

### 1.3 Espaçamento

Base **par de 2 px** com uso pesado de 10/12/14 px. Valores medidos em `padding` e `gap` (frequência somada):

| Token | Valor | Freq. | Uso típico |
|---|---|---:|---|
| `--dsn-space-1` | `2px` | 12 | `gap` entre itens de nav e entre linhas de KPI |
| `--dsn-space-2` | `4px` | 11 | `gap` de título + sublegenda |
| `--dsn-space-3` | `6px` | 18 | `gap` interno de bloco compacto |
| `--dsn-space-4` | `8px` | 29 | `gap` de label → campo |
| `--dsn-space-5` | `10px` | 69 | `gap` de linha de ação, `padding` de item de menu |
| `--dsn-space-6` | `12px` | **190** | **Unidade dominante**: `padding` horizontal de item de nav, `gap` de célula |
| `--dsn-space-7` | `14px` | **146** | `padding` horizontal de campo, `gap` de formulário |
| `--dsn-space-8` | `16px` | 59 | `gap` de grid de cards |
| `--dsn-space-9` | `18px` | 49 | `padding` de card compacto |
| `--dsn-space-10` | `20px` | 96 | `gap` de bloco de conteúdo |
| `--dsn-space-11` | `22px` | 75 | `padding` horizontal de botão |
| `--dsn-space-12` | `24px` | 50 | `padding` de card padrão, `gap` do header |
| `--dsn-space-14` | `28px` | 30 | `padding` de modal |
| `--dsn-space-16` | `32px` | 18 | `padding` de estado vazio, offset do toast |
| `--dsn-space-20` | `40px` | 11 | `padding` horizontal de `<main>` e do header |
| `--dsn-space-24` | `48px` | 33 | `padding` lateral máximo das telas de autenticação |

**Padrão fluido:** blocos de página usam `clamp()` em vez de breakpoints — o eixo vertical escala por `vh` e o horizontal por `vw`. Exemplos canônicos:

- Padding vertical de seção: `clamp(20px,2.4vh,28px)`
- Padding horizontal de seção de autenticação: `clamp(20px,4vw,48px)`
- Gap de bloco: `clamp(16px,2.4vh,22px)`
- Padding de card: `clamp(20px,2.8vh,30px)` (card de autenticação) · `clamp(12px,2vh,18px)` (card de KPI)
- Padding de item de nav: `clamp(7px,1.2vh,10px) 12px`

---

### 1.4 Raio de borda

| Token | Valor | Freq. | Uso |
|---|---|---:|---|
| `--dsn-radius-sm` | `5px`–`6px` | 9 | Checkbox (`5px`), scrollbar |
| `--dsn-radius-md` | `8px` | 8 | Miniatura de capa (48×48) |
| `--dsn-radius-lg` | `10px` | **300** | **Raio padrão**: campo, botão, item de nav, item de menu, toast, banner inline |
| `--dsn-radius-xl` | `12px` | 21 | Card interno, dropzone |
| `--dsn-radius-2xl` | `14px` | 9 | Card de destaque |
| `--dsn-radius-3xl` | `16px` | 74 | **Card e modal** |
| `--dsn-radius-full` | `999px` | 70 | Pill, badge, chip, segmented control, progress bar, toggle |
| `--dsn-radius-circle` | `50%` | 48 | Avatar, botão de play, thumb de slider, spinner |

---

### 1.5 Bordas

- Espessura única: **1 px**. Não há borda de 2 px na UI (exceto o anel de 2 px do thumb do slider e o traço de 2 px do spinner).
- Cor padrão: `#E7E3EF`. Variante suave em textarea e campos de segundo nível: `#E2DDEC`. Divisor entre linhas de tabela: `#F1EEF7`.
- Campo em erro: `border-color: #8C3A2C` (o protótipo troca a cor da borda, não a espessura).
- Dropzone: `1px dashed #D3C7E8` em repouso → `1px solid #7F47DD` em drag → `1px solid #2FA565` quando o arquivo está pronto.
- Sublinhado de tab ativa: `box-shadow: inset 0 -2px 0 #5B2E8F` com `margin-bottom:-1px` sobre a linha de `1px solid #E7E3EF` do container.

---

### 1.6 Elevação

| Token | Valor | Uso |
|---|---|---|
| `--dsn-shadow-xs` | `0 1px 2px rgba(27,18,38,0.04)` | Card levemente elevado |
| `--dsn-shadow-card` | `0 1px 2px rgba(27,18,38,0.04), 0 18px 48px rgba(27,18,38,0.10)` | **Card de autenticação / painel flutuante** (19 usos) |
| `--dsn-shadow-modal` | `0 2px 4px rgba(27,18,38,0.05), 0 18px 40px rgba(27,18,38,0.18)` | **Modal** (10 usos) |
| `--dsn-shadow-menu` | `0 2px 4px rgba(27,18,38,0.05), 0 18px 40px rgba(27,18,38,0.12)` | Dropdown do usuário |
| `--dsn-shadow-toast` | `0 2px 4px rgba(27,18,38,0.05), 0 18px 40px rgba(27,18,38,0.24)` | Toast |
| `--dsn-shadow-cta` | `0 6px 18px rgba(227,83,54,0.26)` | **Hover do botão primário** (removida no `:active`) |
| `--dsn-shadow-focus` | `0 0 0 3px rgba(127,71,221,0.16)` | Anel de foco de campo |

Padrão: sombra dupla (1–2 px de contato + 18 px de difusão ampla). A opacidade da segunda camada cresce com a altitude do elemento: card `0.10` → menu `0.12` → modal `0.18` → toast `0.24`.

---

### 1.7 Movimento

| Token | Valor |
|---|---|
| `--dsn-duration-fast` | `180ms` (entrada de dropdown) |
| `--dsn-duration-base` | `200ms` — **duração padrão** de toda transição de cor/borda/fundo |
| `--dsn-duration-slow` | `220ms`–`280ms` (hover com transform, transição de cor do dropzone) |
| `--dsn-duration-enter` | `240ms` (entrada de modal) |
| `--dsn-duration-reveal` | `320ms`–`700ms` (fade de bloco, animação de onda) |
| `--dsn-ease-out` | `cubic-bezier(0.19,1,0.22,1)` — **easing único** da UI (expo-out) |
| `--dsn-ease-linear` | `linear` (apenas o spinner) |

Transições mais frequentes: `background 200ms` (102×) · `border-color 200ms, box-shadow 200ms` (37×, foco de campo) · `background 200ms, color 200ms` (21×, item de nav).

**Keyframes definidos** (prefixo `dsn`):

| Nome | Definição | Uso |
|---|---|---|
| `dsnSpin` | `to { rotate(360deg) }` | Spinner de botão em loading — `700ms linear infinite` |
| `dsnRise` | `opacity 0→1`, `translateY(6px)→0` | Entrada de modal (`240ms`), dropdown (`180ms`), toast (`200ms`) |
| `dsnWaveX` | `translate3d(-50%,0,0)→0` | Onda decorativa das telas de marca |
| `dsnDriftA/B/C` | `translateY` oscilante ±12–18 px | Elementos flutuantes de fundo |
| `dsnBar`, `dsnBarIn` | `scaleY(0.06–0.30)→1` | Entrada de barras de gráfico |
| `dsnScanWipe` | `clip-path: inset(0 100% 0 0)→inset(0)` | Varredura do dropzone em drag (`1100ms infinite`) |
| `dsnScanSweep` | `left: -58px→100%` | Brilho de varredura da análise de faixa (`1100–1200ms`) |

> **Pendência real:** nenhum dos três protótipos declara `@media (prefers-reduced-motion: reduce)`. `dsnDriftA/B/C`, `dsnWaveX` e `dsnScanWipe` são animações infinitas e precisam de guarda de reduced-motion na implementação (ver 4.7).

---

### 1.8 Iconografia

- **SVG inline, stroke-only.** Sem biblioteca de ícones importada, sem sprite.
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- `stroke-width`: `1.6`–`1.8` (dominante `1.7`); `2` em chevrons.
- Tamanhos renderizados: **14 px** (chevron), **15 px** (item de menu), **17 px** (nav e icon button), **18 px** (checkbox/marcadores).
- Cor: herda `currentColor` na nav e nos botões; `#6B6675` fixo em ícones decorativos de menu. Ícones decorativos recebem `aria-hidden`.

---

### 1.9 Detalhes de plataforma

```css
html { scrollbar-width: thin; scrollbar-color: #D9D3E6 transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D9D3E6; border-radius: 999px; }
::selection { background: rgba(127,71,221,0.18); }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #FFFFFF; }
```

---

## 2. Inventário de componentes de UI

Cada componente traz os valores literais do protótipo. Onde o R2 **não** implementa um componente previsto no PRD, isso está dito explicitamente — é escopo a construir, não token faltante.

### 2.1 Navegação

#### 2.1.1 Sidebar (navegação principal)

**Descrição:** coluna fixa de **260 px**, presente nos três ambientes com estrutura idêntica: logo → grupos de nav → bloco de rodapé. Implementada como `<aside>` `position:sticky; top:0; min-height:100vh` dentro de um `display:grid; grid-template-columns:260px 1fr`.

**Tokens:**

| Propriedade | Valor |
|---|---|
| Largura | `260px` (fixa, `grid-template-columns:260px 1fr`) |
| Fundo | `linear-gradient(180deg,#2D1747 0%,#241239 52%,#1B0D2A 100%)` |
| Borda direita | `1px solid rgba(255,255,255,0.08)` |
| Padding | `clamp(14px,2.6vh,22px) 14px clamp(12px,2.2vh,18px)` |
| Logo | `height: clamp(28px,3.8vh,34px)`, padding `6px 12px clamp(16px,3.2vh,28px)` |
| Gap entre itens | `2px` (Artista) · `3px` dentro do grupo e `clamp(14px,2.2vh,22px)` entre grupos (Curador/Admin) |
| Item — tipografia | `14px` · 500 inativo / 600 ativo |
| Item — padding | `clamp(7px,1.2vh,10px) 12px` · `gap:11px` (ícone 17 px + label) |
| Item — raio | `10px` |
| Item — cor | inativo `#C6BAD9` / ativo `#FFFFFF` |
| Item — fundo | inativo `transparent` / ativo `#7F47DD` |
| Item — hover | inativo `rgba(255,255,255,0.08)` + `color:#FFFFFF` / ativo mantém `#7F47DD` |
| Item — transição | `background 200ms cubic-bezier(0.19,1,0.22,1), color 200ms` |
| Overline de grupo | `10px` · 600 · `letter-spacing:0.18em` · uppercase · `#9B8CB5` · padding `clamp(10px,2vh,17px) 12px 6px` |

**Variantes:**

- **Não há sidebar colapsada no R2.** `sidebarDisplay` é sempre `'flex'` e `shellCols` é sempre `'260px 1fr'` — os hooks de variável existem, mas nenhum estado do protótipo os altera. Colapso é escopo a definir.
- **Rodapé (só Artista):** card de saldo — `padding:14px`, `background:rgba(255,255,255,0.035)`, `border:1px solid rgba(255,255,255,0.08)`, `border-radius:10px`, `gap:6px`; overline "SALDO", valor `17px`/600/tabular-nums em `#FFFFFF`, ação "Comprar Claves" `13px`/600 em `#C6BAD9` → hover `#FFFFFF` + `underline`.

**Estrutura por ambiente (labels reais do R2):**

| Artista | Curador | Admin |
|---|---|---|
| Início | Início | Início |
| *Minha música*: Enviar faixa · Minhas faixas · Devolutivas | *Avaliações*: Fila · Notas e feedback | *Gestão*: Curadores e artistas · Pacotes de Claves |
| *Curadoria*: Curadores | *Desempenho*: Métricas · Financeiro | *Operação*: Financeiro da plataforma · Moderação e antifraude |
| *Conta*: Perfil · Carteira · Configurações | *Conta*: Conta e configurações | *Conta*: Conta e equipe |

#### 2.1.2 Topbar (header do app)

**Descrição:** header sticky, translúcido, com título contextual à esquerda e ações + menu do usuário à direita. Idêntico nos três ambientes.

| Propriedade | Valor |
|---|---|
| Padding | `clamp(14px,2.4vh,20px) 40px clamp(10px,1.6vh,14px)` |
| Fundo | `rgba(255,255,255,0.9)` + `backdrop-filter: blur(10px)` |
| Posição | `position:sticky; top:0; z-index:10` |
| Gap | `24px` entre título e ações; `10px` entre ações |
| Título | `<h1>` `24px` · 700 · `-0.025em` |
| Sublegenda | `13px` · `#6B6675` |
| Altura resultante | ~62–78 px em 1280×800 (não há altura fixa declarada) |

**Ações:** icon button de busca `38×38`, `border-radius:10px`, `border:1px solid #E7E3EF`, hover `border-color:#5B2E8F`. Botão de perfil: pill `border-radius:999px`, padding `5px 12px 5px 5px`, avatar `28×28` circular em `#F6F3FB` com iniciais `11px`/700 em `#5B2E8F`, nome `14px`/600, chevron `14px` em `#6B6675`.

#### 2.1.3 Dropdown do usuário

`position:absolute; top:52px; right:0`, largura `236px`, `background:#FFFFFF`, `border:1px solid #E7E3EF`, `border-radius:10px`, `padding:6px`, `gap:2px`, `z-index:20`, sombra `--dsn-shadow-menu`, entrada `dsnRise 180ms cubic-bezier(0.19,1,0.22,1)`.

Itens: `14px`/500 · `#1B1226` · padding `10px 12px` · `border-radius:10px` · hover `background:#F6F3FB` · ícone 15 px em `#6B6675`. Divisor: `<span>` de `height:1px; background:#E7E3EF; margin:4px 0`.

#### 2.1.4 Tabs (abas sublinhadas)

**Uso real:** Conta e configurações — Artista (Dados da conta · Preferências · Segurança), Curador (idem), Admin (Dados pessoais · Equipe · Papéis e permissões).

| Propriedade | Valor |
|---|---|
| Container | `border-bottom:1px solid #E7E3EF`, `display:flex`, `gap:30px` (Admin) / `32px` (Artista), `align-items:flex-end` |
| Label | `15px` · 600 · `letter-spacing:-0.01em` |
| Padding | `0 2px clamp(9px,1.5vh,13px)` · `margin-bottom:-1px` |
| Cor ativa / inativa | `#1B1226` / `#6B6675` |
| Indicador | `box-shadow: inset 0 -2px 0 #5B2E8F` (ativa) / `transparent` (inativa) |
| Transição | `color 200ms` |

O único `role="tablist"` do R2 está no ambiente Artista — os demais grupos de aba são `<button>` sem semântica ARIA (ver 4.6).

**Implementado como links** (`Abas`), com a mesma aparência: a aba viaja em `?aba=`, o que lhe dá endereço (a copy de Conta diz *"gere outro em Configurações › Segurança"*), faz a tela funcionar sem JavaScript e permite ao servidor renderizar só a aba aberta. Sendo navegação de verdade, o padrão acessível é `<a>` com `aria-current="page"`, e não `role="tab"` — que promete ao leitor de tela um painel trocando sem sair da página. Ver [07-pendências §B.2](prd/07-pendencias-e-divergencias.md).

#### 2.1.5 Segmented control (filtro pill)

**Uso real:** filtros de status na Fila do curador, filtros do Extrato de Claves, escolha de meio de pagamento.

| Propriedade | Valor |
|---|---|
| Container | `display:inline-flex`, `gap:3px`, `background:#F6F3FB`, `border:1px solid #E7E3EF`, `border-radius:999px`, `padding:4px` |
| Item | `13px` · 600 · `border-radius:999px` · padding `8px 15px` · `white-space:nowrap` |
| Item ativo | `color:#FFFFFF` · `background:#5B2E8F` (variante escura: `#1B1226`) |
| Item inativo | `color:#4A4553` · `background:transparent` |
| Transição | `background 200ms, color 200ms` |

#### 2.1.6 Breadcrumb — **não existe no Release 2**

Nenhum dos três protótipos implementa trilha de navegação; a orientação é dada pelo `<h1>` + sublegenda do topbar (`appTitle` / `appSub`). Se breadcrumb permanecer no escopo, é componente novo — sem tokens herdados do R2.

---

### 2.2 Formulários e entrada de dados

#### 2.2.1 Campo de texto (label + input + erro)

O padrão do R2 é um `<label>` em coluna que **envolve** o input (associação implícita, sem `for`/`id`).

```
<label style="display:flex;flex-direction:column;gap:8px">   ← gap 7px em telas densas
  <span>  label: 11px / 600 / 0.16em / uppercase / #6B6675
  <input> campo
  <span>  erro: 13px / #8C3A2C
```

| Estado | Especificação |
|---|---|
| **Default** | `font-size:15px` · `color:#1B1226` · `background:#FFFFFF` · `border:1px solid #E7E3EF` · `border-radius:10px` · `padding:13px 14px` · `outline:none` (altura resultante ≈ 45 px) |
| **Focus** | `border-color:#7F47DD` · `box-shadow:0 0 0 3px rgba(127,71,221,0.16)` |
| **Erro** | `border-color:#8C3A2C` + mensagem `13px` em `#8C3A2C` abaixo |
| **Com ícone à direita** | `padding:13px 48px 13px 14px`; botão `34×34`, `border-radius:10px`, cor `#6B6675`, hover `background:#F6F3FB; color:#1B1226` |
| **Denso (cadastro em passos)** | `padding: clamp(9px,1.25vh,12px) 14px` |
| **Transição** | `border-color 200ms, box-shadow 200ms` |
| Gap do formulário | `14px` entre campos (`<form style="gap:14px">`) |

**Não há estado `disabled` de input no R2** e nenhum campo tem indicador visual de obrigatoriedade (asterisco) — ver 4.4.

#### 2.2.2 Textarea

Herda os tokens do input, com três diferenças: `resize:none`, `line-height` explícito (`1.5`–`1.6`), e borda `#E2DDEC` (mais suave) nos campos longos.

| Variante | Especificação |
|---|---|
| Bio (Artista, `rows="2"`) | `15px`/`1.5` · `border:1px solid #E7E3EF` · `padding:11px 14px` |
| Contexto para o curador (`rows="5"`) | `14px`/`1.6` · `border:1px solid #E2DDEC` · `padding:12px 14px` |
| Bio do curador (`rows="4"`) | `15px`/`1.55` · `border:1px solid #E2DDEC` · `padding:13px 14px` |
| Justificativa de nota | `13px`/`1.55` · `border:1px solid #E2DDEC` · `padding:11px 12px` · `flex:1` |

Foco idêntico ao input. Contador de caracteres aparece como `<span>` de `12px`/`#6B6675` em linha própria com `justify-content:space-between`.

#### 2.2.3 Select

Só existe no ambiente Admin (papel de membro, papel do convite). `appearance:none` com seta desenhada por gradiente CSS.

| Propriedade | Valor |
|---|---|
| Tipografia | `13px`/500 (em tabela) · `15px`/400 (em formulário) |
| Borda / raio | `1px solid #E7E3EF` · `10px` |
| Padding | `9px 32px 9px 12px` (tabela) · `12px 40px 12px 14px` (formulário) |
| Seta | `linear-gradient(45deg,transparent 50%,#6B6675 50%), linear-gradient(135deg,#6B6675 50%,transparent 50%)` |
| Bloqueado | `background-color:#F6F3FB` · `cursor:not-allowed` (linha do próprio usuário) |

#### 2.2.4 Checkbox

Desenhado como `<span>` — não é `<input type="checkbox">`.

| Propriedade | Valor |
|---|---|
| Caixa | `18×18` · `border-radius:5px` · `border:1px solid` · `margin-top:2px` |
| Desmarcado | `background:#FFFFFF` · borda `#E7E3EF` (erro: `#8C3A2C`) |
| Marcado | `background:#7F47DD` · check SVG branco |
| Estado indeterminado | não existe no R2 |

#### 2.2.5 Radio button — **não existe no Release 2**

Nenhum `type="radio"` nos três arquivos. Escolha única é resolvida por **segmented control** (2.1.5) ou por **card selecionável** (2.4.2). Se radio for necessário, herdar borda/raio do checkbox.

#### 2.2.6 Toggle (switch)

**Uso real:** aba Preferências (notificações por e-mail, resumo semanal etc.).

| Propriedade | Valor |
|---|---|
| Trilha | `44×24` · `border-radius:999px` · `padding:3px` · `border:none` |
| Knob | `18×18` circular · `background:#FFFFFF` · `box-shadow:0 1px 2px rgba(27,18,38,0.2)` |
| Transição | trilha `background 200ms cubic-bezier(0.19,1,0.22,1)`; knob `margin-left 200ms cubic-bezier(0.19,1,0.22,1)` |
| Semântica | `role="switch"` + `aria-checked` (presente no Admin; ausente nos demais — ver 4.6) |

#### 2.2.7 Slider (nota objetiva / nota subjetiva)

**Uso real:** avaliação do curador — notas de 0 a 5 com passo `0.1`.

```css
input[data-dsn="range"] { appearance: none; height: 8px; border-radius: 999px; }
input[data-dsn="range"]::-webkit-slider-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #FFFFFF; border: 2px solid #7F47DD;
  box-shadow: 0 0 0 4px rgba(127,71,221,0.14), 0 1px 3px rgba(27,18,38,0.24);
}
```

Preenchimento da trilha via `background`: `linear-gradient(90deg,#5B2E8F,#7F47DD 55%,#E35336) left center/<pct> 100% no-repeat, #EEEAF5`.

#### 2.2.8 Dropzone (upload de mp3)

| Estado | Borda | Fundo | Texto | Extra |
|---|---|---|---|---|
| **Repouso** | `1px dashed #D3C7E8` | `#FFFFFF` | `#5B2E8F` — "Arraste o mp3 aqui" | `clip-path: inset(0 100% 0 0)` |
| **Drag over** | `1px solid #7F47DD` | `#F4EEFD` | "Solte para carregar" | anel `0 0 0 4px rgba(127,71,221,0.14)` + `dsnScanWipe 1100ms infinite` |
| **Pronto** | `1px solid #2FA565` | `#F2FAF5` | `#1E7A4A` — nome do arquivo | `clip-path: inset(0)` |

`border-radius:12px`, `gap:6px`, label `14px`/600, sublabel `12px`/`#6B6675`, transição de cor `280ms` e de `clip-path` `640ms cubic-bezier(0.19,1,0.22,1)`.

#### 2.2.9 Medidor de força de senha

Três barras `flex:1; height:4px; border-radius:999px` + label. Mapa de cores por nível (barra1, barra2, barra3, texto, rótulo):

| Nível | Barras | Texto | Rótulo |
|---|---|---|---|
| 0 | `#E7E3EF` · `#E7E3EF` · `#E7E3EF` | `#6B6675` | "Mínimo 8 com número" |
| 1 | `#8C3A2C` · `#E7E3EF` · `#E7E3EF` | `#8C3A2C` | "Senha fraca" |
| 2 | `#A8761C` · `#A8761C` · `#E7E3EF` | `#A8761C` | "Senha média" |
| 3 | `#2FA565` · `#2FA565` · `#2FA565` | `#2FA565` | "Senha forte" |

Requisitos com dot: dot `#2FA565` atendido / `#D9D3E6` pendente; texto `#1B1226` atendido / `#6B6675` pendente.

---

### 2.3 Botões e ações

#### 2.3.1 Botão primário

| Estado | Especificação |
|---|---|
| **Default** | `background:#E35336` · `color:#FFFFFF` · `font-size:16px`/600 · `letter-spacing:-0.01em` · `border:none` · `border-radius:10px` · `padding:15px 22px` · `gap:10px` |
| **Hover** | `background:#C4442A` · `box-shadow:0 6px 18px rgba(227,83,54,0.26)` |
| **Active** | `background:#A93A22` · `box-shadow:none` |
| **Loading** | `background:#EFB6A9` + spinner `16×16` (`border:2px solid rgba(255,255,255,0.4)`, `border-top-color:#FFFFFF`, `dsnSpin 700ms linear infinite`) |
| **Disabled (saldo insuficiente)** | `background:#E7E3EF` · `color:#9B93A8` · `cursor:not-allowed` |
| **Transição** | `background 200ms cubic-bezier(0.19,1,0.22,1), box-shadow 200ms` |
| **Denso** | `padding: clamp(10px,1.5vh,13px) 22px` · variante `14px 24px` em telas de confirmação |

#### 2.3.2 Botão secundário

`color:#5B2E8F` · `background:#FFFFFF` · `border:1px solid #5B2E8F` · `font-size:16px`/600 · `border-radius:10px` · `padding:14px 24px` · hover `background:#F6F3FB` · `transition: background 200ms`.

Variante "provedor social" (`border:1px solid #E7E3EF`, `color:#1B1226`, `13–14px`/600, `padding:11px 8px`, hover `border-color:#5B2E8F; background:#F6F3FB`).

#### 2.3.3 Botão terciário / ghost

`appearance:none; background:none; border:none; padding:0` · `13–14px`/600 · `color:#5B2E8F` · hover `color:#7F47DD; text-decoration:underline`.

Variante neutra (ex.: "Pular" no onboarding): `14px`/600 · `color:#6B6675` · `padding:8px 10px` · `border-radius:10px` · hover `background:#F6F3FB; color:#1B1226`.

Variante destrutiva: `color:#8C3A2C`, fundo transparente.

#### 2.3.3b Botão destrutivo com caixa

O R2 usa **dois** vermelhos com caixa, e a diferença entre eles é semântica: um abre a confirmação, o outro executa.

| Variante | Especificação | Uso real |
|---|---|---|
| **Contorno** (`perigoContorno`) | `color:#8C3A2C` · `background:#FFFFFF` · `border:1px solid #C98A7C` · `14px`/600 · `border-radius:10px` · `padding:11px 20px` · hover `background:#FBEDEA; border-color:#8C3A2C` | "Excluir conta" no card de encerramento (7.4 / 17.4) — **abre** o diálogo |
| **Sólido** (`perigo`) | `color:#FFFFFF` · `background:#8C3A2C` · `border:none` · `15px`/600 · `border-radius:10px` · `padding:12px 22px` · hover `background:#75291C` | "Excluir minha conta" e "Excluir mídia", dentro do diálogo — **executa** |

Fora do diálogo, vermelho cheio não aparece: no R2 ele é a última tecla, não um convite. O passo 1 da exclusão ("Continuar") usa o primário laranja justamente porque nada foi apagado ainda.

#### 2.3.4 Icon button

| Variante | Especificação |
|---|---|
| **Com borda (topbar)** | `38×38` · `border:1px solid #E7E3EF` · `background:#FFFFFF` · `border-radius:10px` · `color:#1B1226` · hover `border-color:#5B2E8F` · `transition: border-color 200ms` |
| **Sem borda (dentro de campo)** | `34×34` · `border-radius:10px` · `color:#6B6675` · hover `background:#F6F3FB; color:#1B1226` |
| **Play (avaliação)** | `40×40` · `border-radius:50%` · `background:#E35336` · `color:#FFFFFF` · hover `background:#C4442A` · glifo `13px`/700 (`▶` / `❙❙`) |

Todo icon button do R2 traz `aria-label` + `title`.

---

### 2.4 Contêineres e exibição de dados

#### 2.4.1 Card

| Variante | Especificação |
|---|---|
| **Card padrão** | `background:#FFFFFF` · `border:1px solid #E7E3EF` · `border-radius:16px` · `padding:24px` · `gap:16px`–`20px` |
| **Card compacto (KPI)** | `padding: clamp(12px,2vh,18px)` · `gap:2px` |
| **Card de autenticação** | `max-width:440px`–`520px` · `padding: clamp(20px,2.8vh,30px)` · `gap: clamp(16px,2.4vh,22px)` · `text-align:center` · sombra `--dsn-shadow-card` |
| **Card de formulário lateral** | `max-width:436px` · `padding: clamp(18px,2.4vw,26px)` · `gap:14px` |
| **Card com lista embutida** | `border:1px solid #E7E3EF` · `border-radius:16px` · `overflow:hidden` (sem padding; as linhas trazem o próprio) |
| **Card em erro** | `border:1px solid #EBD2CD` · `background:#FDF8F7` |
| **Card em sucesso** | `border:1px solid #BFE3CE` · `background:#F2FAF5` · `border-radius:12px`–`14px` |
| **Card selecionado (pacote)** | `background:#FBF9FE` · botão interno invertido (`background:#5B2E8F`, `color:#FFFFFF`) |

#### 2.4.2 KPI / stat tile

Grid `repeat(3,1fr)` com `gap: clamp(10px,1.8vh,16px)`. Cada tile: numeral `clamp(24px,3.4vh,30px)`/700/`tabular-nums`/`-0.03em`/`1.1` → label `13px`/600 → descrição `12px`/`#6B6675`/`1.4`.

#### 2.4.3 Tabela / listagem

O R2 não usa `<table>` — cada linha é um `display:grid` com as mesmas colunas do cabeçalho.

| Propriedade | Valor |
|---|---|
| Container | `border:1px solid #E7E3EF` · `border-radius:16px` · `overflow:hidden` |
| Cabeçalho | `background:#FBFAFE` · `border-bottom:1px solid #E7E3EF` · `padding:10px clamp(16px,2.4vh,24px)` |
| Célula de cabeçalho | `10px` · 600 · `letter-spacing:0.16em` · uppercase · `#6B6675` |
| Linha | `min-height: clamp(56px,7.4vh,64px)` · `padding:0 clamp(16px,2.4vh,24px)` · `border-bottom:1px solid #F1EEF7` · `gap:12px` |
| Linha inativa | `opacity:0.62` |
| Célula de conteúdo | `13px`; valores numéricos com `font-variant-numeric:tabular-nums` e `justify-self:end` |
| Avatar em linha | `34×34` · `border-radius:50%` · `background:#F1EAFB` · iniciais `12px`/700 em `#5B2E8F` |

**Grids de coluna reais:**

- Equipe (Admin): `minmax(0,1.2fr) minmax(0,1.15fr) 160px 206px 152px`
- Pacotes (Admin): `minmax(0,1fr) repeat(4,112px)`
- Curadores/artistas (Admin): `minmax(0,clamp(132px,15vw,228px)) minmax(44px,0.7fr) minmax(68px,1fr) minmax(64px,0.95fr) minmax(68px,1fr) minmax(74px,1.05fr) minmax(142px,1.5fr)`
- Fila (Curador): `minmax(0,1.6fr) minmax(0,0.95fr) minmax(0,1fr) minmax(0,1.05fr) minmax(0,1fr) 22px`
- Extrato (Artista): `96px minmax(0,1fr) minmax(0,0.62fr) 92px 96px`
- Minhas faixas (Artista): `minmax(0,1fr) minmax(0,1.5fr) 118px 116px`

**Paginação:** o R2 renderiza a lista completa (dados semeados) — não há paginação nem scroll infinito implementado. Definição pendente de produto.

#### 2.4.4 Badge / pill de status

| Propriedade | Valor |
|---|---|
| Base | `font-size:10px` · 700 · `letter-spacing:0.10em`–`0.12em` · uppercase · `border-radius:999px` · `padding:5px 9px`–`5px 10px` · `white-space:nowrap` |
| Variante de classe de curador | `11px` · 600 · `letter-spacing:0.10em` · `padding:5px 12px` |
| Truncamento | `overflow:hidden; text-overflow:ellipsis` quando em coluna estreita |

Mapas de cor reais:

| Contexto | Estado | Texto / Fundo |
|---|---|---|
| Fila do curador | Nova | `#5B2E8F` / `#F1EAFB` |
| | Em escuta | `#1E7A4A` / `#E6F5ED` |
| | Demais (atrasada) | `#8C3A2C` / `#FBEDEA` |
| Extrato de Claves | Adquiridas | `#5B2E8F` / `#F1EAFB` |
| | Devolvidas | `#1E7A4A` / `#E6F5ED` |
| | Usadas | `#4A4553` / `#F1EFF5` |
| Classe do curador | Bronze | `#8A5A12` / `#FDF3E2` |
| Equipe (Admin) | Ativo | texto `#1B7A46`, dot `#2FA565` |
| | Convite pendente | texto `#8A5A12`, dot `#E0A03A` |
| | Desativado | texto `#6B6675`, dot `#B9B2C6` |

**Cor de prazo (fila do curador)** — mapeada por horas restantes:

| Faixa | Texto | Barra |
|---|---|---|
| Vencido (`h < 0`) | `#8C3A2C` | `#C0472F` |
| `< 12 h` | `#8C3A2C` | `#E35336` |
| `< 24 h` | `#1B1226` | `#7F47DD` |
| `≥ 24 h` | `#4A4553` | `#B79BE4` |

#### 2.4.5 Progress bar

Trilha `height:4px`–`6px` · `border-radius:999px` · `background:#EEEAF5` · `overflow:hidden`. Preenchimento: mesma altura e raio, largura percentual, cor conforme contexto (`--dsn-grad-brand-h` no slider; `#7F47DD`/`#E35336` no medidor de escuta).

#### 2.4.6 Stepper (cadastro em passos)

Numeral `30×30` · `border-radius:9px` · `13px`/700/`tabular-nums`. Estados: passo atual `background:#5B2E8F`/`color:#FFFFFF`; concluído `background:#B79BE4`/`color:#1B1226`; futuro `background:#E7E3EF`/`color:#9B93A8`. Dots alternativos: `flex:1; height:4px; border-radius:999px`.

#### 2.4.7 Player de escuta (Curador)

Card `border:1px solid #E7E3EF; border-radius:16px; padding:18px; gap:14px`. Capa `48×48`, `border-radius:8px`, iniciais `14px`/700 em `#5B2E8F`. Título `16px`/700/`-0.02em` com truncamento; artista `13px`/`#6B6675`. Play `40×40` circular `#E35336`. Barra de escuta `height:6px`/`999px`/`#EEEAF5`. Rodapé: rótulo de progresso `12px`/600 e duração `12px`/`#6B6675`. Nota fixa `12px`/`1.5`/`#6B6675`: *"A escuta é medida. A avaliação só é aceita a partir de 60% da faixa ouvidos."*

---

### 2.5 Feedback

#### 2.5.1 Banner inline

`display:flex; align-items:center; gap:8px` · `font-size:13px`/`line-height:1.45` · `border-radius:10px` · `padding:10px 13px`.

| Tipo | Fundo | Borda | Texto |
|---|---|---|---|
| Erro | `#FDECE8` | `#F3C6BA` | `#8C3A2C` |
| Sem permissão / alerta | `#FFF6E6` | `#F0DDB6` | `#8A5A12` |
| Erro (Artista/Curador) | `#FBEDEA` | `#EBD2CD` | `#8C3A2C` |

#### 2.5.2 Toast

`position:fixed; left:32px; bottom:32px; z-index:70` · `background:#1B1226` · `color:#FFFFFF` · `border-radius:10px` · `padding:14px 18px` · `max-width:420px` · `gap:12px` · sombra `--dsn-shadow-toast` · entrada `dsnRise 200ms cubic-bezier(0.19,1,0.22,1)`.

#### 2.5.3 Modal + backdrop

| Elemento | Valor |
|---|---|
| Backdrop | `position:fixed; inset:0` · `background:rgba(27,18,38,0.42)` · `backdrop-filter:blur(2px)` · `padding:32px` · `z-index:60` · flex centrado |
| Modal | `background:#FFFFFF` · `border-radius:16px` · `padding:28px` · `gap:16px` · `width:460px` (confirmação) / `520px` (formulário) · `max-width:100%` |
| Sombra | `--dsn-shadow-modal` |
| Entrada | `dsnRise 240ms cubic-bezier(0.19,1,0.22,1)` |

**Comportamento no R2:** o backdrop é apenas visual — não há handler de clique-fora, tecla ESC, focus trap nem bloqueio de scroll do `body`. Todos os quatro são requisitos de implementação (ver 4.3).

#### 2.5.4 Estado vazio

`padding:32px 20px` · flex coluna centrada · `gap:6px` · título `15px`/600 · descrição `13px`/`#6B6675`. Ex.: *"Nada nesse filtro" / "Troque o tipo de movimentação para ver o restante."*

#### 2.5.5 Spinner

`16×16` · `border-radius:50%` · `border:2px solid rgba(255,255,255,0.4)` · `border-top-color:#FFFFFF` · `animation: dsnSpin 700ms linear infinite`. Só aparece dentro de botão primário em loading.

---

## 3. Layout e padrões de navegação

### 3.1 Viewport, grid e fluidez

- **Viewport de referência:** 1280 × 800 (desktop). Os três protótipos foram construídos e validados nessa resolução.
- **Breakpoints:** **nenhum `@media` nos três arquivos.** A responsividade do R2 é obtida por `clamp()` (eixo vertical em `vh`, horizontal em `vw`), `minmax()` nos grids e `flex-wrap`. Não há layout mobile ou tablet definido — definir breakpoints é decisão de produto ainda aberta, não valor a extrair.
- **Grid do shell:** `display:grid; grid-template-columns:260px 1fr` (sidebar + conteúdo), `align-items:stretch`.
- **Grids de conteúdo em uso:** `repeat(3,1fr)` (KPIs), `repeat(2,minmax(0,1fr))`, `repeat(4,minmax(0,1fr))`, `repeat(auto-fit,minmax(266px,1fr))` (cards de curador), `minmax(300px,0.4fr) minmax(0,0.6fr)` (split de avaliação), `minmax(0,1fr) 236px` (conteúdo + coluna auxiliar).
- **Gutters:** `12px`–`16px` em grids de card; `clamp(10px,1.8vh,16px)` no grid de KPI; `12px` entre células de tabela.
- **Margem lateral do conteúdo:** `40px` fixos no `<main>` e no header do app.

### 3.2 Estrutura do shell autenticado

Idêntica nos três ambientes:

```
<div grid 260px 1fr>
  <aside>   sidebar sticky, min-height:100vh, gradiente roxo
  <div flex column min-width:0>
    <header> sticky, translúcido, padding clamp(14px,2.4vh,20px) 40px clamp(10px,1.6vh,14px)
    <main>   padding clamp(18px,2.8vh,32px) 40px clamp(20px,3vh,40px)   ← Admin: clamp(14px,2.2vh,26px) 40px clamp(16px,2.4vh,32px)
```

| Dimensão | Artista | Curador | Admin |
|---|---|---|---|
| Largura da sidebar | `260px` | `260px` | `260px` |
| Padding do `<main>` | `clamp(18px,2.8vh,32px) 40px clamp(20px,3vh,40px)` | idem | `clamp(14px,2.2vh,26px) 40px clamp(16px,2.4vh,32px)` |
| Padding do header | `clamp(14px,2.4vh,20px) 40px clamp(10px,1.6vh,14px)` | idem | idem |
| Fundo do conteúdo | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |

**Largura máxima do conteúdo por tipo de página:**

| Página | `max-width` |
|---|---|
| Conta e configurações (Artista/Curador) | `880px` |
| Conta e equipe (Admin) | `1000px` |
| Formulário de convite / edição (Admin) | `720px` |
| Placeholder de módulo | `560px` |
| Card de autenticação | `440px`–`520px` |
| Painel lateral de cadastro do curador | `436px` |
| Bloco de texto de marca | `620px` |

### 3.3 Telas de autenticação (fora do shell)

```
<div min-height:100vh flex column background:#FFFFFF>
  <div flex:1 position:relative background:linear-gradient(180deg,#FDFCFF,#F8F5FD 45%,#F1ECFA)>
    …camadas decorativas (dsnDriftA/B/C, dsnWaveX)…
    <main z-index:1 flex centrado
          gap: clamp(12px,1.8vh,18px)
          padding: clamp(20px,2.4vh,28px) clamp(20px,4vw,48px)>
      logo (height:36px) → título → card
```

Variante split-screen (cadastro do curador): `grid-template-columns` com painel `<aside>` de `background:#FAF7FE`, `border:1px solid #F0EAF9`, `border-radius:12px`, `padding: clamp(15px,1.8vw,20px)`.

### 3.4 Padrões de página observados

| Padrão | Onde | Composição |
|---|---|---|
| **Painel / KPIs** | Início (Artista, Curador, Admin) | Bloco de destaque → grid `repeat(3,1fr)` de KPI tiles → cards de lista |
| **Listagem** | Minhas faixas, Fila, Extrato, Curadores e artistas, Pacotes | Cabeçalho de seção + ações → segmented control de filtro → container com cabeçalho `#FBFAFE` + linhas em grid → estado vazio quando o filtro não retorna nada |
| **Split de trabalho** | Avaliação (Curador) | `minmax(300px,0.4fr) minmax(0,0.6fr)`: coluna esquerda = player + justificativa; coluna direita = sliders de nota + feedback |
| **Formulário em passos** | Cadastro do curador (8 passos), Enviar faixa (p1 → p2 → p3 → ok → status) | Stepper → uma pergunta por tela → ações no rodapé; largura contida (`436px`–`560px`) |
| **Configurações em abas** | Conta (3 ambientes) | `max-width:880px`/`1000px` → tabs sublinhadas → cards de seção com `gap: clamp(16px,2.6vh,28px)` |
| **Confirmação destrutiva** | Excluir conta, excluir pacote | Modal `460px` + backdrop; exige senha e a palavra `EXCLUIR` |

### 3.5 Hierarquia de navegação (Release 2)

```
Login (unificado Artista/Curador)          Login restrito (Admin, por convite)
  ├─ Cadastro → Verificação de e-mail        ├─ Recuperação → Confirmação neutra
  │    ├─ Artista: Onboarding (4 passos)     └─ Redefinição → Senha redefinida
  │    └─ Curador: Cadastro em 8 passos            └─ Shell Admin
  │         → Classificação
  │           ├─ Boas-vindas Bronze
  │           └─ Cadastro em análise (Prata)
  ├─ Recuperação → Confirmação neutra → Redefinição → Senha redefinida
  └─ Shell autenticado (Artista | Curador)
```

**Telas construídas no R2** (valores de `telaInicial` em cada protótipo):

- **Artista:** Login · Cadastro · Recuperação · Redefinição · Onboarding · Perfil · Enviar · Detalhes (link) · Detalhes (mp3) · Status de envio · Carteira · Editar cadastro · Configurações
- **Curador:** Login · Cadastro · Recuperação · Redefinição · Painel · Fila · Avaliação · Conta e configurações · Classificação · Boas-vindas Bronze · Cadastro em análise
- **Admin:** Login · Recuperação · Redefinição · Painel · Pacotes de Claves · Conta e equipe

**Troca de perfil Artista ↔ Curador:** no R2 existe apenas como item "Ver como curador" no dropdown do topbar, que dispara o toast *"disponível na versão final"*. Não há tela de seleção de perfil implementada no ambiente Curador. A ativação de papel acontece por "Ativar papel de curador" na aba de Conta.

---

## 4. Diretrizes de acessibilidade

### 4.1 Escopo

Piso obrigatório: **WCAG 2.1 nível AA**. Os itens abaixo estão divididos entre **conforme no protótipo** (herdar) e **a corrigir na implementação** (o R2 não resolve).

### 4.2 Contraste de cor — auditoria dos tokens reais

Razões calculadas sobre os pares efetivamente usados no R2:

| Par | Ratio | AA texto normal | Observação |
|---|---|---:|---|
| `#1B1226` / `#FFFFFF` — texto primário | 18.09:1 | ✅ | |
| `#4A4553` / `#FFFFFF` — texto secundário | 9.26:1 | ✅ | |
| `#6B6675` / `#FFFFFF` — texto de apoio | 5.55:1 | ✅ | |
| `#6B6675` / `#F6F3FB` — apoio sobre superfície roxa | 5.06:1 | ✅ | |
| `#6B6675` / `#FBFAFE` — cabeçalho de tabela | 5.34:1 | ✅ | |
| `#5B2E8F` / `#FFFFFF` — link roxo | 9.41:1 | ✅ | |
| `#7F47DD` / `#FFFFFF` — hover de link | 5.46:1 | ✅ | |
| `#FFFFFF` / `#7F47DD` — nav item ativo | 5.46:1 | ✅ | |
| `#C6BAD9` / `#2D1747` — nav item inativo (topo) | 8.62:1 | ✅ | |
| `#C6BAD9` / `#1B0D2A` — nav item inativo (base) | 10.04:1 | ✅ | |
| `#9B8CB5` / `#241239` — overline de grupo | 5.58:1 | ✅ | |
| `#FFFFFF` / `#1B1226` — toast | 18.09:1 | ✅ | |
| `#8C3A2C` / `#FFFFFF` — erro inline | 7.62:1 | ✅ | |
| `#1E7A4A` / `#E6F5ED` — badge sucesso | 4.74:1 | ✅ | margem estreita |
| `#5B2E8F` / `#F1EAFB` — badge informativo | 8.02:1 | ✅ | |
| `#8A5A12` / `#FDF3E2` — badge alerta | 5.38:1 | ✅ | |
| `#8C3A2C` / `#FBEDEA` — badge erro | 6.68:1 | ✅ | |
| `#4A4553` / `#F1EFF5` — badge neutro | 8.12:1 | ✅ | |
| `#7F47DD` / `#FFFFFF` — borda de foco | 5.46:1 | ✅ | > 3:1 exigido para componente |
| `#8C3A2C` / `#FFFFFF` — borda de erro | 7.62:1 | ✅ | |

**Reprovações e riscos — corrigir na implementação:**

| Par | Ratio | Problema | Correção sugerida |
|---|---|---:|---|
| `#FFFFFF` / `#E35336` — **botão primário** | **3.78:1** | O label é `16px`/600, que **não** é "texto grande" (exige ≥ 24 px, ou ≥ 18.66 px em bold). Falha AA para texto normal. | Escurecer o fundo do botão para o tom de hover `#C4442A` (4.99:1) — ou manter `#E35336` apenas em labels ≥ 24 px. |
| `#FFFFFF` / `#EFB6A9` — **botão em loading** | **1.76:1** | Texto praticamente ilegível durante a submissão. | Manter o fundo `#E35336`/`#C4442A` e sinalizar loading só com spinner + `aria-busy`, ou usar texto `#8C3A2C` sobre `#EFB6A9` (4.33:1 — ainda abaixo de 4.5:1). |
| `#9B93A8` / `#E7E3EF` — botão disabled | **2.33:1** | Abaixo de 4.5:1. WCAG isenta componentes desabilitados, mas o rótulo fica ilegível. | Usar `#6B6675` sobre `#E7E3EF` (4.40:1) ou `#4A4553` (7.34:1). |
| `#E7E3EF` / `#FFFFFF` — borda padrão de campo | **1.26:1** | Falha 1.4.11 (componente ≥ 3:1): a borda do input não é perceptível por si. | Escurecer a borda em repouso para ≥ 3:1 `#B5AFC0` (2.13:1) e `#9B93A8` (2.94:1) não bastam; `#8A8398` chega a 3.63:1 e atende. **Decisão de design necessária** — alternativa é dar contraste ao campo pelo fundo, não pela borda. |
| `#2FA565` / `#FFFFFF` — dot de sucesso | 3.14:1 | OK como indicador gráfico (≥ 3:1), **não** como texto. | Não usar `#2FA565` para texto; para texto de sucesso usar `#1E7A4A` (5.33:1) ou `#1B7A46` (5.36:1). |
| `#A8761C` / `#FFFFFF` — "senha média" | 3.98:1 | É texto (`13px`), falha AA. | Trocar por `#8A5A12` (5.91:1 sobre branco, 5.51:1 sobre `#FFF6E6`). |
| `#B5AFC0` / `#FFFFFF` — numeral de stepper inativo | 2.13:1 | Falha AA. | Usar `#6B6675` para o numeral de passo futuro. |

### 4.3 Foco e teclado

**Já resolvido no R2 (herdar):**

- Todo controle é `<button>`, `<input>`, `<textarea>` ou `<select>` nativo — não há `div` clicável. A ordem de foco segue o DOM, que segue a hierarquia visual.
- Não há `tabindex` positivo em nenhum dos três arquivos.
- Campos têm estado de foco visível e de alto contraste: `border-color:#7F47DD` + `box-shadow:0 0 0 3px rgba(127,71,221,0.16)` (5.46:1).

**A implementar (o R2 não resolve):**

1. **Anel de foco para botões, tabs, itens de nav e cards clicáveis.** O protótipo define `style-focus` apenas em inputs e textareas; os `<button>` usam `outline:none` implícito via `appearance:none` e dependem do foco padrão do navegador. Definir token global:
   ```css
   --dsn-focus-outline: 2px solid #7F47DD;   /* 5.46:1 sobre branco */
   --dsn-focus-offset: 2px;
   ```
   Na sidebar escura, usar `outline-color:#FFFFFF` (contraste ≥ 3:1 sobre `#2D1747`–`#1B0D2A`).
2. **Modal:** aprisionar o foco, mover o foco para o primeiro controle na abertura, devolver ao disparador no fechamento, fechar com `Esc`, bloquear o scroll do `body`. Nenhum desses comportamentos existe no R2 — o backdrop é puramente decorativo.
3. **Dropdown do usuário:** fechar com `Esc`, navegar com ↑/↓, fechar ao perder o foco.
4. **Segmented control e tabs:** navegação com ←/→ dentro do grupo, um único ponto de tabulação por grupo (`tabindex="-1"` nos itens não selecionados).
5. **Slider de nota:** `<input type="range">` já é operável por teclado; garantir que o valor lido seja o número (0–5) e não a porcentagem.

**Atalhos obrigatórios:** Tab/Shift+Tab (navegar) · Enter/Espaço (ativar) · Esc (fechar modal e dropdown) · setas (mover dentro de grupo composto e no slider).

### 4.4 Formulários

**Já resolvido no R2:** todo campo está dentro de um `<label>` (associação implícita, válida para leitores de tela), com texto de label sempre visível — o placeholder é dica adicional, nunca substituto. Campos com formato específico têm `autocomplete` correto (`email`, `current-password`, `new-password`, `name`).

**A implementar:**

1. **Associação explícita.** Preferir `for`/`id` ao wrapping implícito: é mais robusto quando o campo é reposicionado no layout e necessário quando label e campo não são irmãos.
2. **Obrigatoriedade.** Nenhum campo do R2 marca obrigatoriedade. Adicionar `*` visível + `required` + `aria-required="true"`.
3. **Agrupamento.** Nenhum `<fieldset>`/`<legend>` nos três arquivos. Envolver grupos relacionados — "Modalidades de compartilhamento", "Dados de pagamento", credenciais do curador — em `fieldset` + `legend`.
4. **Dicas programáticas.** Os textos de ajuda (`12px`/`#6B6675`) existem visualmente mas não estão ligados ao campo. Adicionar `aria-describedby`:
   ```html
   <p id="upload-hint">Formato aceito: .mp3. Arraste o arquivo ou clique para selecionar.</p>
   <input type="file" aria-describedby="upload-hint">
   ```
   Casos concretos no R2: instrução do dropzone, regra de senha ("Mínimo 8 com número"), unicidade do `@` ("Único na plataforma" / "Este @ já está em uso"), regra de escuta mínima de 60% na avaliação, regra de devolução de Claves em 7 dias.
5. **Checkbox e toggle desenhados.** O checkbox do R2 é um `<span>` estilizado dentro de um `<button>`; o toggle do Admin já traz `role="switch"` + `aria-checked`, mas os dos ambientes Artista e Curador não. Padronizar: `<input type="checkbox">` visualmente customizado, ou `role="checkbox"`/`role="switch"` com `aria-checked` em todos.

### 4.5 Erros e validação

**Já resolvido no R2:** o erro é sempre identificado em texto (`13px`/`#8C3A2C`) abaixo do campo específico, **e** a borda muda de cor (`#8C3A2C`) — não há dependência exclusiva de cor. Banners de erro combinam ícone + título + descrição, e as mensagens dizem o que fazer ("Confira os dados e tente de novo").

**A implementar:**

1. `aria-invalid="true"` no campo em erro e `aria-describedby` apontando para o `id` da mensagem.
2. Região `aria-live="polite"` para o banner de topo do formulário, para que o leitor de tela anuncie a falha de submissão sem mover o foco.
3. Foco programático no primeiro campo inválido após a submissão.
4. **Toast:** `role="status"` + `aria-live="polite"`. O toast do R2 é puramente visual e desaparece — mensagens de resultado de ação ("Cadastro salvo", "Papel atualizado") precisam ser anunciadas.
5. **Botão em loading:** `aria-busy="true"` e `disabled`; o spinner precisa de `aria-hidden="true"` e o texto do botão deve permanecer legível (ver 4.2).

### 4.6 Semântica e estrutura

**Já resolvido no R2:** uso de `<aside>`, `<nav>`, `<header>`, `<main>`, `<form>`, `<label>` e `<h1>`; ícones decorativos têm `aria-hidden`; todo icon button tem `aria-label` **e** `title`.

**A implementar:**

1. **Hierarquia de headings.** Cada tela tem um `<h1>` (o título do topbar), mas os títulos de seção dentro do conteúdo são `<span>` estilizados — não há `<h2>`/`<h3>` reais na maioria das páginas (só 2 `<h2>` por ambiente). Promover títulos de card e de seção a heading no nível correto.
2. **Tabs.** `role="tablist"` aparece uma única vez (Artista). Aplicar o padrão completo em todos os grupos: `role="tablist"` no container, `role="tab"` + `aria-selected` + `aria-controls` nos botões, `role="tabpanel"` + `aria-labelledby` no painel.
3. **Listagens em grid.** As tabelas são `div` com `display:grid`; um leitor de tela não percebe linha/coluna. Implementar como `<table>` semântica, ou aplicar `role="table"`/`row`/`columnheader`/`cell`.
4. **Skip link.** Não existe. Adicionar "Pular para o conteúdo" antes da sidebar — são 8 a 10 itens de nav antes do conteúdo em cada tela.
5. **Estado ativo da nav.** O item ativo é indicado apenas por cor e peso. Adicionar `aria-current="page"`.
6. **Progresso.** Barras de progresso e medidor de escuta: `role="progressbar"` com `aria-valuenow`/`aria-valuemin`/`aria-valuemax` (ou texto equivalente já visível).
7. **Badge de status.** O texto do badge já carrega o significado (não é só cor) — manter essa regra em qualquer novo status.

### 4.7 Movimento

**A implementar (o R2 não tem nenhuma guarda):** `dsnDriftA/B/C`, `dsnWaveX` e `dsnScanWipe` rodam `infinite` nas telas de autenticação e no dropzone. Adicionar:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Exceção deliberada: manter o spinner (`dsnSpin`) e a barra de progresso, que comunicam estado — reduzir, não eliminar.

### 4.8 Zoom e reflow

O R2 é desenhado para 1280 px sem `@media`; o eixo vertical usa `vh`, o que faz o texto **encolher** quando a janela é baixa. Isso conflita com WCAG 1.4.4 (redimensionar texto até 200%) e 1.4.10 (reflow a 320 px). Na implementação:

- Trocar `clamp(x, Nvh, y)` por `clamp()` baseado em `rem`/`vw` ou por breakpoints reais nos tamanhos de **texto** (manter `vh` só em espaçamento decorativo).
- Garantir `min-height` em vez de `height` fixa em qualquer contêiner de texto.
- Definir o comportamento da sidebar de 260 px abaixo de ~900 px de largura (colapso/off-canvas) — hoje indefinido.

---

## 5. Pendências (não extraíveis do Release 2)

Itens que este documento **não** pode preencher porque o protótipo não os decide:

1. **Breakpoints e layout mobile/tablet** — nenhum `@media` nos três arquivos.
2. **Sidebar colapsada** — o hook (`sidebarDisplay`, `shellCols`) existe, mas nenhum estado o usa.
3. **Breadcrumb** — não implementado; o topbar cumpre o papel de orientação.
4. **Radio button** — não implementado; escolha única resolvida por segmented control ou card selecionável.
5. **Paginação / scroll infinito** — todas as listas renderizam o dataset semeado completo.
6. **Tema escuro da área de conteúdo** — o escuro existe só na sidebar; não há paleta dark para superfícies de conteúdo.
7. **Estado `disabled` de input** — só existe em `select` (Admin) e em botão.
8. **`prefers-reduced-motion`** — ausente.
9. **Notificações** — o módulo aparece no PRD e nos itens de nav das versões anteriores, mas não há tela nem componente de notificação no R2 (nem badge de contagem).
10. **Contraste da borda de campo em repouso** (`#E7E3EF`, 1.26:1) — exige decisão de design, não apenas de implementação.
