# Alinhamento ao protótipo aprovado

Os três HTML desta pasta (`Artista.html`, `Curador.html`, `Admin.html`) são o protótipo
**aprovado pelo cliente em 30/09/2026**. Eles substituem os de `docs/R2/` como fonte da verdade
do visual.

Para ver no navegador, use a configuração "Protótipos aprovados" do `.claude/launch.json`, na
porta 4102.

## O que mudou do R2 para o aprovado

| | R2 | Aprovado |
|---|---|---|
| Títulos e números de destaque | Inter 700–800 | **Anton** 400, caixa-alta, tracking 0.01em |
| Texto | Inter | **Archivo** |
| Tinta | `#1B1226` | `#140D1A` |
| Cantos | 10–16px, pílulas de 999px | **2–6px** |
| Menu lateral | degradê roxo, ativo `#7F47DD` | `#140D1A` chapado, ativo girando entre `#B780E7`, `#EFB6A9` e `#C6B4DE` |
| Telas de entrada | claras, com ondas | **escuras, com a órbita de discos** |
| Botão primário | `#C4442A` | `#E35336`, caixa-alta, tracking 0.06em |

A escala de tamanhos é a mesma nas duas versões, e a copy é quase toda igual: 338 de 368 trechos
do Artista coincidem.

## Fase 0 — feita em 14/10/2026

- Tokens, fontes (`pnpm prototipo:fontes`), menu lateral, cabeçalho com a faixa de quatro cores e
  botões.
- Moldura de entrada com a órbita: login, cadastro, recuperação, redefinição, onboarding, convite
  e verificação, nos dois apps.
- Telas portadas:
  - Artista: Perfil, Carteira, vitrine de pacotes, Enviar faixa.
  - Curador: Fila em prateleiras, wizard e as telas de classe (Classificação, Bronze, Em análise).
  - Admin: Pacotes em grade.
- Testes acompanharam:
  - `cartaoDaFila` substitui a linha da tabela da Fila;
  - os pacotes do admin passaram de tabela para lista;
  - C1 e A1 foram reescritos.

## Fase 1 — feita em 14/10/2026 (antes das 10h)

- Artista: Escolher curador (cartões largos), Status do envio (andamento em barras), Extrato, Pagamento (título).
- Artista: Contexto (passo 2) e Revisar, com o cartão da faixa e o vinil.
- Curador: Detalhe da faixa (13.1), moldura da avaliação com o cartão da faixa, Notas e feedback,
  Meu cadastro (vitrine no topo).
- Conferidas sem mudança: Conta do curador (mesmas abas e cartões; o aprovado não tem a aba
  Perfil, e os dados de recebimento seguem "próxima entrega" até o Pix existir).

## Fase 1 — fechada em 14/10/2026 (tarde)

**Como se verifica:** `e2e/prototipo/` agora abre os HTML **aprovados** (não mais os da R2) e
compara a tipografia de todo texto pareado — corpo, peso, tracking, entrelinha, caixa e cor —, além
da fonte dos títulos (Anton) e da altura do logotipo. São 75 cenários, todos passando:

- `telas-de-autenticacao.spec.ts`: logins, cadastros, recuperação, redefinição, verificação.
- `telas-da-r1.spec.ts`: onboarding, conta do artista, wizard do curador (8 passos), classificação,
  Bronze, análise, conta do curador, conta e equipe do admin.
- `telas-da-r2.spec.ts`: carteira, perfil, editar cadastro, enviar, fila, avaliação (notas), meu
  perfil do curador, pacotes do admin.

Para rodar contra o servidor de desenvolvimento, sem build:

```
BASE_URL=http://localhost:3000 BASE_URL_ADMIN=http://admin.localhost:3001 npx playwright test e2e/prototipo
```

Feito nesta etapa:

- **Transversal:** fundo areia `#F4F2EF` nos três ambientes; botão secundário com contorno roxo
  (curador e admin) ou tinta (artista); cor do item ativo do menu fixa por tela (o `NAVC` do
  protótipo); abas do artista sublinhadas em tinta; campo somente leitura em lilás; `h1`/`h2` sem o
  `!important` da Fase 0; sobretítulo roxo na Fila e na Avaliação.
- **Artista:** passo 1 do envio com a faixa encontrada (capa, vinil, origem); Configurações em
  880px; Editar cadastro num só cartão (foto, dados, links, rodapé); cadastro com o painel "Como
  funciona" escuro dentro do cartão; onboarding com o navegador do tour em tinta.
- **Curador:** wizard de cadastro escuro sobre a órbita nos passos 2 a 8; avaliação em três colunas
  (player sob a capa, critérios em obrigatórios/opcionais, justificativa no painel ao lado).
- **Admin:** Dados pessoais com capa escura e avatar; Equipe e Papéis com cabeçalho em tinta e
  contagem por papel; CTAs da faixa escura sem caixa-alta.

## Divergências que ficam (decisão nossa, registradas como exceção na suíte)

| Onde | O aprovado | A aplicação | Por quê |
|---|---|---|---|
| Borda de campo | `#E5DEEA` | `#9890A6` | WCAG 1.4.11 pede 3:1 na borda de campo branco sobre branco. |
| Boas-vindas Bronze | "Começar o curso" é o primário | "Ir para o painel" é o primário | O curso é de outra release e o botão está desabilitado. |
| Wizard, passo 8 | Links de termos em `#5B2E8F` sobre `#140D1A` | Lilás `#C6B4DE` | 1,6:1 no aprovado — ilegível. |
| Onboarding | "Pular" no alto da tela | "Pular" no cartão | Composição do tour; pode subir se o cliente quiser. |
| Perfil, enviar | "Ver todas" e "Detectar faixa" ativos | Desabilitados sem destino/sem link | Funcionalidade. |

## Pendente — depende de decisão do cliente ou de banco

- [ ] **Capa do perfil** (Editar cadastro): o aprovado tem cinco capas prontas e upload. Pede uma
  coluna em `perfil` e um bucket — migração no banco compartilhado com produção.
- [ ] **Envio em 4 passos**: no aprovado a escolha do curador vem **antes** da revisão (Envio ·
  Contexto · Escolher curador · Revisar). Hoje são 3 passos e a escolha vem depois. Muda o fluxo.
- [ ] Dados de recebimento (curador) e de cobrança (artista): o aprovado mostra Pix e cartão; as
  telas dizem "próxima entrega" até a funcionalidade existir.

### Fora do escopo da R1/R2

Estas telas existem no aprovado e continuam marcadas como "Em breve" no app. Confirmar com o
cliente:

- Início
- Minhas faixas
- Curadores e o detalhe do curador
- Notificações
- Financeiro e saque
- Moderação
- Detalhe do usuário
