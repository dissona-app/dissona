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

## Fase 1 — pendente

Cada tela abaixo segue o mesmo método: abrir o protótipo e o app no mesmo tamanho de janela e
portar layout, espaçamento, estados (vazio, carregando, erro, sucesso) e efeitos (hover, foco,
animação).

### Artista

- [ ] Detalhes por link e por mp3 (passo 1, estado com a faixa detectada)
- [ ] Editar cadastro (capa do perfil, que o aprovado tem)
- [ ] Configurações (abas)

### Curador

- [ ] Avaliação: notas, subjetiva, compartilhamento, outras e remuneração
- [ ] Carteira

### Admin

- [ ] Editar pacote
- [ ] Convite, onboarding e verificação
- [ ] Equipe (abas Equipe e Papéis)

### Transversal

- [ ] Componentes: Tabela, Modal, Aviso, Etiqueta, Chips, Abas, Campo e Selecao com os literais
  do aprovado.
- [ ] Tirar o `!important` provisório de `h1`/`h2` em `packages/nucleo/estilos/global.css`,
  ajustando módulo a módulo.
- [ ] Ligar a suíte `e2e/prototipo` aos HTML aprovados.

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
