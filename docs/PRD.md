# PRD — Dissona

**Product Requirements Document · Versão 1 (Releases 1 a 5)**
Fraktal Softwares · Documento gerado a partir do Discovery V4, dos protótipos navegáveis da Release 2 e do Guia de Testes da Release 2.

---

## Índice

| Documento | Conteúdo |
|---|---|
| **PRD.md** (este) | Visão, personas, modelo de negócio, escopo, releases, navegação, métricas |
| [01 — Regras de negócio](prd/01-regras-de-negocio.md) | Claves, classes, remuneração, ranking, SLA, segurança, LGPD |
| [02 — Ambiente Artista](prd/02-ambiente-artista.md) | Módulos 1 a 10 |
| [03 — Ambiente Curador](prd/03-ambiente-curador.md) | Módulos 11 a 18 |
| [04 — Ambiente Admin](prd/04-ambiente-admin.md) | Módulos 19 a 24 e 27 |
| [05 — Ambiente Público](prd/05-ambiente-publico.md) | Módulo 26 — Homepage |
| [06 — Matriz de notificações](prd/06-matriz-notificacoes.md) | Evento × destinatário × canal |
| [07 — Pendências e divergências](prd/07-pendencias-e-divergencias.md) | Decisões abertas e conflitos entre fontes |

### Documentos técnicos

| Documento | Conteúdo |
|---|---|
| [architecture.md](architecture.md) | Stack, estrutura de pastas, camadas, integrações, convenções, Definition of Done |
| [data-model.md](data-model.md) | Esquema do banco, enums, RLS, funções, ordem das migrations |
| [requirements.md](requirements.md) | Requisitos funcionais e não funcionais, com critérios de aceite |
| [implementation-plan.md](implementation-plan.md) | Sequenciamento das releases, tasks e dependências técnicas |
| [design-system.md](design-system.md) | Tokens extraídos dos protótipos da R2, componentes base |
| [business-model.md](business-model.md) | Problema, proposta de valor, receita, custos, métricas |
| [open-questions.md](open-questions.md) | Perguntas em aberto, bloqueios por release e riscos |
| [BACKLOG.md](BACKLOG.md) | **Tasks em execução — só até a Release 2** |

---

## Como usar este documento

**Escopo especificado ≠ escopo em execução.**

- Este PRD e os documentos de ambiente cobrem a **V1 completa** — 24 módulos, 5 releases. É o discovery validado com o cliente, e é o que dá contexto às decisões técnicas: várias escolhas de R1 e R2 só estão corretas porque R3, R4 e R5 são conhecidas (o modelo de `envio` depende da Seleção de curadores, o `compartilhamento` alimenta a homepage, o ledger de Claves precisa acomodar estornos).
- O **[BACKLOG](BACKLOG.md) é o escopo em execução** e vai só até a Release 2.
- Nada é construído adiantado. As migrations são numeradas por release ([modelo de dados §11](data-model.md#11-ordem-das-migrations)) e nenhuma tabela de R3+ é criada antes da hora.

**Uma exceção, já decidida:** os módulos de R1 e R2 emitem eventos de notificação cuja central de leitura só existe na R5. Por isso a **migration de `notificacao` foi movida da R5 para a R1** (agora `0005`): a gravação existe desde o primeiro dia, as telas continuam na R5. Gravar desde já custa um `insert` por evento; recuperar depois custaria reabrir dez módulos entregues e testados. Ver [matriz de notificações](prd/06-matriz-notificacoes.md) e [modelo de dados §11](data-model.md#11-ordem-das-migrations).

---

## 1. Visão do produto

### 1.1 Descrição

A Dissona é uma plataforma web que conecta artistas musicais a curadores experientes para **avaliação estruturada e paga de músicas**. Cada submissão gera notas objetivas por critério, nota subjetiva e feedback escrito, sintetizados por IA em relatórios por música e por artista ao longo do tempo.

O produto centraliza o diagnóstico de evolução artística — técnica, composição, produção e identidade — transformando feedback disperso em direção concreta de carreira, enquanto remunera curadores **por qualidade e confiabilidade, não por alcance**.

### 1.2 Desafio de negócio

> Artistas independentes não têm acesso a feedback estruturado e confiável: os concorrentes entregam avaliações "de cabeça", subjetivas e rasas, que irritam o artista em vez de evoluí-lo.
>
> O desafio da Dissona é entregar crítica real guiada por método, de forma cordial e leve, transformando avaliação em estrada de evolução, e construir confiança **nos dois lados do marketplace**: o artista confia na qualidade da curadoria (método, calibração e ranking) e o curador confia no pagamento (regras claras de prazo e liberação).

### 1.3 O que representa sucesso

Sucesso é a Dissona se tornar indispensável para o artista independente:

- O artista **submete uma segunda música** após o primeiro relatório.
- A música é **compartilhada** (playlist, post ou matéria) e gera plays.
- Feedback entregue **em até 72h**, com curadores de calibração alta.
- O artista usa a Dissona **publicamente como selo de qualidade** da carreira.
- A plataforma reproduz fielmente o método definido no discovery, em experiência simples, confortável e com **tom de feedback leve**.

### 1.4 Princípios de produto

Extraídos das anotações de UI e dev do discovery e da copy dos protótipos:

1. **Método acima de opinião.** Toda nota tem critério; toda nota baixa tem justificativa.
2. **Crítica cordial.** Feedback honesto sem ser destrutivo — "avaliação como estrada de evolução".
3. **Confiança nos dois lados.** O artista precisa confiar na curadoria; o curador precisa confiar no pagamento.
4. **Ranking ≠ classe.** Desempenho e credenciais são coisas diferentes e nunca devem se confundir na interface.
5. **Prazo é contrato.** 72h para repasse cheio, 7 dias para devolução automática — sem exceção manual.

---

## 2. Personas

### 2.1 Tião Folk — Artista independente, 27 anos

Proficiência tecnológica média-alta. Lança músicas por distribuidora digital, grava em home studio.

| | |
|---|---|
| **Objetivos** | Plays como credencial para fechar shows · acompanhar a própria evolução música a música · receber crítica honesta sem ser destruído · ser citado em posts e matérias de música autoral · profissionalizar a carreira sem depender de gravadora · entrar em playlists relevantes · saber exatamente onde melhorar antes do próximo lançamento · exibir o selo Dissona como prova de seriedade |
| **Atividades** | Lança músicas via distribuidora no Spotify · compõe e grava em home studio · divulga lançamentos no Instagram · envia música e capa pelo computador, com a banda reunida · acompanha plays e ouvintes pelo celular · negocia shows e cachês · ensaia com a banda · manda músicas por DM para playlists e blogs |
| **Ferramentas** | Spotify for Artists · computador para envio de arquivos e capas · DAW / home studio · YouTube · Pix · distribuidora digital · Instagram · WhatsApp |
| **Dores** | Não sabe se o problema é afinação, ritmo, mixagem ou composição · pagou concorrente e recebeu feedback "de cabeça", sem método · plays baixos sem explicação · feedback de amigos e família é enviesado · investe em gravação sem saber se a música está pronta · não tem régua para comparar a própria evolução · feedback agressivo desanima, silêncio frustra · DMs para playlists ficam sem resposta |

**Implicação de produto:** o envio precisa funcionar bem no desktop (banda reunida), mas o acompanhamento precisa funcionar no celular. O relatório precisa ser comparável ao longo do tempo, não uma nota isolada.

### 2.2 João das Couves — Curador profissional, 38 anos

Mantém playlist com 7.500 salvamentos, escreve resenhas em blog e Instagram.

| | |
|---|---|
| **Objetivos** | Monetizar a curadoria com recorrência · avaliar com método, sem depender só do gosto · cumprir o prazo de 72h sem sufoco · crescer a audiência da playlist e do blog · ser reconhecido como referência · subir no ranking e exibir calibração alta como reputação · receber rápido e com regras claras · receber músicas organizadas em fila, sem spam de DM |
| **Atividades** | Mantém playlist com 7.500 salvamentos · escreve resenhas em blog e Instagram · atualiza playlists semanalmente · publica posts e matérias sobre artistas novos · responde artistas e negocia divulgações · acompanha estatísticas · recebe dezenas de músicas por DM · avalia músicas com fone, em janelas de tempo livre |
| **Ferramentas** | Spotify (playlists e estatísticas) · WhatsApp e DMs · e-mail · fones de referência · Pix · WordPress · Instagram · planilhas de controle |
| **Dores** | Sem métrica que prove sua qualidade · trabalho de escuta não remunerado · pagamento incerto nas plataformas atuais · medo de magoar o artista com nota baixa · falta de critério claro para justificar notas · artistas cobrando resposta fora de hora · plataformas que valorizam alcance, não qualidade · volume de DMs sem filtro nem contexto |

**Implicação de produto:** o curador avalia em janelas curtas de tempo livre — a fila precisa ser ordenável por urgência e a avaliação precisa ser retomável. A calibração e o ranking existem para dar a ele a métrica de qualidade que hoje não tem.

### 2.3 Curador-artista

Uma mesma conta pode acumular os dois papéis. O login é único; o segundo papel é ativado em Conta e configurações. Nos protótipos, o header traz "Ver como curador" / "Ver como artista".

---

## 3. Modelo de negócio

### 3.1 Proposta de valor

- Diagnóstico objetivo e evolutivo, guiado pelo método.
- Curador monetiza com reputação mensurável (ranking e calibração).
- Cursos acionados pelo feedback.
- Banco de dados de evolução dos artistas (coach).
- Compartilhamento real: plays viram credencial de carreira.
- Selo de qualidade Dissona.

### 3.2 Segmentos de clientes

- Artistas independentes, todos os gêneros (80%+ do mercado).
- Mercado internacional (concorrência direta com SubmitHub).
- Curadores profissionais: playlists, blogs, imprensa, YouTube.
- Gravadoras e selos.
- Curadores-artistas (mesmo login).

### 3.3 Canais

- Plataforma própria (web; mobile-first a confirmar).
- Login social: Google, Facebook, SoundCloud.
- Campanha nacional de contratação de curadores.
- E-mail transacional e notificações.

### 3.4 Fontes de receita

- Pacotes de Claves com desconto progressivo.
- Comissão de 50% sobre Claves consumidas (1 Clave = R$ 10).
- Ecossistema de serviços ao artista (modelo Spotify / Mercado Livre).
- Cursos a partir do diagnóstico do feedback.

### 3.5 Estrutura de custos

- Infraestrutura: Supabase (Postgres, Auth, Storage, Edge Functions) e Vercel.
- Campanha de contratação de curadores.
- IA para geração dos relatórios.
- Gateway de pagamento e payouts aos curadores.
- Jurídico: termos, direitos autorais, LGPD, contratos.

---

## 4. Escopo da V1

### 4.1 Módulos por ambiente

**Ambiente Artista — 26,5h** (14h discovery + 12,5h UI)

| # | Módulo | Horas | Release |
|---|---|---|---|
| 1 | Autenticação (login único) | 2 | R1 |
| 2 | Dashboard do Artista | 4 | R4 |
| 3 | Minhas Músicas › Enviar (link/mp3) | 2 | R2 |
| 3.3 | Minhas Músicas › Status de envio | 3,5 | R3 |
| 4 | Seleção de Curadores | 3,5 | R3 |
| 5 | Carteira e Claves | 3,5 | R2 |
| 6 | Minhas Músicas › Catálogo + análises | 5,5 | R4 |
| 7 | Conta e Configurações | 1,25 | R1 |
| 10 | Notificações | 1,25 | R5 |

**Ambiente Curador — 22,5h** (12h discovery + 10,5h UI)

| # | Módulo | Horas | Release |
|---|---|---|---|
| 11 | Autenticação (compartilhada com o artista) | 2 | R1 |
| 12 | Perfil / Cadastro de Curador | 2,5 | R1 |
| 12.6 | Alteração de cadastro / mídias | 2,5 | R1 |
| 13 | Avaliações › Fila / pendentes | 2,5 | R2 |
| 14 | Avaliações › Notas + feedback | 4 | R2 |
| 15 | Financeiro do Curador | 2,5 | R4 |
| 16 | Métricas de Performance | 2,5 | R3 |
| 17 | Conta e Configurações | 2 | R1 |
| 18 | Notificações | 2 | R5 |

**Ambiente Admin — 17h** (8,5h discovery + 8,5h UI)

| # | Módulo | Horas | Release |
|---|---|---|---|
| 19 | Autenticação Admin | 1 | R1 |
| 20 | Gestão de Curadores e Artistas | 2,5 | R3 |
| 21 | Gestão de Pacotes de Claves | 2,5 | R2 |
| 22 | Financeiro da Plataforma | 3,5 | R5 |
| 23 | Moderação e Antifraude | 2 | R3 |
| 24 | Dashboard Admin | 2 | R4 |
| 27 | Conta e equipe | 3,5 | R1 |

**Ambiente Público — 8h** (3,5h discovery + 4,5h UI)

| # | Módulo | Horas | Release |
|---|---|---|---|
| 26 | Homepage pública (+ CTA de convite ao artista) | 8 | R5 |

**Total V1: 74h** — 38h de discovery + 36h de UI.

### 4.2 Fora da V1 (adiado para V2)

Mapeado no discovery, **sem requisitos detalhados neste PRD**:

| Módulo | Horas | Motivo |
|---|---|---|
| Planos / Assinatura (comparativo, checkout, área do assinante) | 4,5 | Adiado para a V2 |
| Espaço de diálogo (mensagens áudio/vídeo curador ↔ artista, Premium) | 3,5 | Adiado para a V2 |
| Laboratório / Desenvolvimento Artístico (DISSONAR, incentivos, cursos) | — | Aparece no fluxograma, sem escopo fechado |
| Validação automática de compartilhamento via Spotify API | — | Na V1 a auditoria é manual, por denúncia |
| Pacote Premium com feedback em 48h | — | Exigirá recálculo da remuneração por classe |

### 4.3 Restrição de projeto

O escopo total mapeado somava **82h** contra **70h vendidas**. O banco foi recarregado para **74h**, com **+4h aprovadas pelo cliente**, mediante o adiamento de Planos/Assinatura e Espaço de diálogo para a V2. Qualquer ampliação de escopo na V1 exige nova recarga.

---

## 5. Releases

### Release 1 — Fundação do produto · 16,75h

Login único, criação de conta e onboarding em todos os ambientes, além das configurações de conta.

| Módulo | Ambiente | Horas |
|---|---|---|
| Autenticação | Artista | 2 |
| Autenticação | Curador | 2 |
| Autenticação Admin | Admin | 1 |
| Cadastro de curador | Curador | 2,5 |
| Alteração de cadastro / mídias | Curador | 2,5 |
| Conta e configurações | Artista | 1,25 |
| Conta e configurações | Curador | 2 |
| Conta e equipe | Admin | 3,5 |

> **Nota sobre a Autenticação.** A tela de login é **uma só**, mas o escopo aloca **2h para o ambiente Artista e 2h para o ambiente Curador** (4h no total da R1). É assim que os totais do discovery fecham: Artista 26,5h e Curador 22,5h incluem, cada um, 2h de Autenticação. A tabela de releases do board lista a linha uma única vez com "2h", o que faz a soma das linhas dar 14,75h contra o total declarado de 16,75h — **a diferença é exatamente essa duplicidade**. O valor correto da R1 é **16,75h**.

### Release 2 — Núcleo do produto · 14,5h

Envio de música, compra e uso de Claves, e o ciclo de avaliação do curador: fila, notas objetivas e subjetivas e feedback.

| Módulo | Ambiente | Horas |
|---|---|---|
| Minhas Músicas › Enviar (link/mp3) | Artista | 2 |
| Carteira e Claves | Artista | 3,5 |
| Avaliações › Fila / pendentes | Curador | 2,5 |
| Avaliações › Notas + feedback | Curador | 4 |
| Pacotes de Claves | Admin | 2,5 |

### Release 3 — Descoberta e curadoria · 14h

O artista escolhe curadores e acompanha o envio; métricas e ranking do curador; gestão e moderação no admin.

| Módulo | Ambiente | Horas |
|---|---|---|
| Seleção de curadores | Artista | 3,5 |
| Minhas Músicas › Status de envio | Artista | 3,5 |
| Métricas de performance | Curador | 2,5 |
| Gestão de Curadores e Artistas | Admin | 2,5 |
| Moderação e Antifraude | Admin | 2 |

### Release 4 — Dashboards e relatórios · 14h

Painel e relatórios (IA) do artista, catálogo de músicas, dashboard do admin e financeiro do curador.

| Módulo | Ambiente | Horas |
|---|---|---|
| Dashboard do Artista | Artista | 4 |
| Minhas Músicas › Catálogo + análises | Artista | 5,5 |
| Financeiro do curador | Curador | 2,5 |
| Dashboard Admin | Admin | 2 |

### Release 5 — Vitrine pública e fechamento · 14,75h

Homepage pública com CTA de convite ao artista, financeiro da plataforma e notificações dos dois ambientes.

| Módulo | Ambiente | Horas |
|---|---|---|
| Notificações | Artista | 1,25 |
| Notificações | Curador | 2 |
| Financeiro da plataforma | Admin | 3,5 |
| Homepage pública | Público | 8 |

---

## 6. Arquitetura de navegação

### 6.1 Sitemap

```
PÚBLICO & ACESSO
├── Homepage (pública)
│   ├── Artistas Compartilhados → Detalhe do artista compartilhado
│   ├── Artistas em Destaque (matéria)
│   ├── Ranking de curadores → Banner 100 curadores
│   └── Convite / CTA (artista)
└── Autenticação
    ├── Login
    ├── Cadastro
    ├── Recuperação de senha → Redefinição de senha
    ├── Verificação de e-mail
    ├── Seleção de perfil
    └── Onboarding (por ambiente)

ARTISTA
├── Dashboard → Relatório geral (IA)
├── Seleção de curadores → Detalhe do curador
├── Carteira e Claves → Pacotes → Checkout · Extrato
├── Minhas Músicas
│   ├── Enviar música (link / mp3)
│   ├── Status de envio
│   ├── Catálogo de músicas → Detalhe da música
│   │   └── Análise do curador → Avaliação do curador · Detalhes/matéria
├── Conta e configurações (Perfil · Dados da conta · Preferências · Segurança)
└── Notificações → Detalhe · Preferências

CURADOR
├── Cadastro de curador (Identificação · Modalidades · Serviços e preço ·
│   Perfil profissional · Classificação · Tela final por classe ·
│   Alteração de cadastro/mídias)
├── Fila de avaliações → Detalhe do item
│   └── Avaliação (Notas objetivas → Nota subjetiva + feedback →
│       Compartilhamento → Outras formas → Remuneração por classe)
├── Métricas de performance → Progressão Prata → Ouro
├── Financeiro → Solicitação de saque
├── Conta e configurações (Perfil · Dados da conta · Preferências · Segurança)
└── Notificações → Detalhe · Preferências

ADMIN
├── Login admin → Recuperação · Redefinição
├── Dashboard admin (KPIs)
├── Gestão de curadores e artistas
│   ├── Detalhe do usuário
│   ├── Bloqueio e exclusão
│   ├── Aprovação de curadores (Prata)
│   └── Dossiê promoção Prata→Ouro + decisão
├── Pacotes de Claves → Criar/editar pacote
├── Financeiro da plataforma (Visão geral · Relatórios · Estornos · Payouts)
├── Moderação e antifraude (Logs · Denúncias · Bloqueio manual)
└── Conta e equipe (Dados pessoais · Equipe · Convidar membro · Papéis e permissões)
```

### 6.2 User flow — Artista

> *Como artista independente, quero enviar minha música e receber feedback estruturado, para evoluir e saber onde melhorar.*

1. Artista acessa a Dissona → **Login / Cadastro**
2. Seleção de perfil: **Artista** → **Dashboard do artista**
3. **Tem Claves?**
   - Não → **Carteira: comprar Claves** → volta ao passo 4
   - Sim → passo 4
4. **Submeter música** → **Já está no streaming?**
   - Sim → autodetecção pelo link
   - Não → **Detalhes da música (MP3)**
5. **Selecionar curadores** → **Confirmar e aplicar Claves**
6. **Acompanhar status do envio** (recebeu → ouviu → avaliando → pronto)
7. **Aguardar feedback (até 72h)** → **Ver análise / relatório (IA)**
8. **Avaliar curador** → **Relatório de evolução do artista**

### 6.3 User flow — Curador

> *Como curador profissional, quero avaliar com método e ser remunerado por qualidade e pontualidade — respeitando prazos e classes.*

1. Curador acessa a Dissona → **Login / Cadastro**
2. Seleção de perfil: **Curador** → **Primeiro acesso?**
   - Sim → **Cadastro: modalidades, serviços, preços** → **Perfil profissional / credenciais** → **Classificação Bronze / Prata**
     - Bronze → parabéns + curso de curadoria (auto-aprovado)
     - Prata → "em análise" → aprovação do admin
   - Não → passo 3
3. **Fila de avaliações** → **Respondeu em 7 dias?**
   - Não → **Crédito devolvido ao artista** (sem avaliação)
   - Sim → passo 4
4. **Avaliação: notas objetivas** (mede escuta) → **Nota subjetiva + feedback (≥150 caracteres)**
5. **Cumpriu requisitos base? (72h + obrigatórios)**
   - Sim → **Piso no prazo (por classe)**
   - Não → **Piso em atraso (por classe)**
6. **Cumpriu opcionais?** → **Acréscimo até o teto da classe**
7. **Libera crédito (avaliação concluída)** → **Financeiro: ganhos em R$** → **Solicitar saque**

**Fluxo paralelo — Progressão de classe:**
Prata elegível (≥60 curadorias · 2 ciclos · score ≥0,85 · zero penalidades) → **Dossiê ao admin** → **Admin decide** → Promovido a Ouro, ou permanece Prata.
Rebaixamento: Ouro com score <0,75 por 2 ciclos → revisão → possível volta a Prata. Thresholds (0,85 / 60 / 2 ciclos) são configuráveis.

### 6.4 User flow — Admin

> *Como administrador, quero moderar, conciliar finanças, pagar curadores e gerir planos e mídia, para manter a plataforma saudável.*

1. **Login admin (restrito)** → **Dashboard admin (KPIs)**
2. **Gestão de curadores**
   - **Cadastro Prata pendente?** → Aprovar / recusar Prata
   - **Candidato a Ouro?** → Analisar dossiê → Decidir: aprovar / adiar / recusar
3. **Moderação e antifraude (logs, denúncias)** → **Conta dentro das regras?** → Bloqueio manual + registro
4. **Financeiro da plataforma (rateio 50%)** → **Tudo conciliado?**
   - Não → Processar estorno
   - Sim → **Executar payouts aos curadores**
5. **Gestão de pacotes de Claves** · **Gestão da Homepage & Mídia** · **Conta e equipe**

### 6.5 User flow — Homepage pública

> *Como visitante, quero descobrir artistas e curadores em destaque, para conhecer a Dissona e me cadastrar.*

1. Visitante acessa a Homepage → **Seções: Compartilhados, Destaque, Ranking**
2. **Explora artista/curador em destaque**
3. **Convite / CTA (artista)** — headline em uso: *"O que você fez pela sua música hoje?" → Enviar minha música*
4. **Quer entrar na Dissona?**
   - Sim → **Login / Cadastro** → **Seleção de perfil** → entra na plataforma
   - Não → segue navegando (descoberta/mídia)

**Alternativas de headline registradas** (voz da marca, tom emocional):
1. "O que você fez pela sua música hoje?" → *Enviar minha música* ← **em uso**
2. "Onde está a sua jornada?" → *Começar agora*
3. "Sua música merece ser dissonada." → *Quero ser dissonado*

---

## 7. Fontes e regra de precedência

| Fonte | Data | Cobertura |
|---|---|---|
| **Board de Discovery (FigJam, V4)** | — | Todos os 24 módulos da V1 |
| **Protótipos navegáveis Release 2** (Artista, Curador, Admin) | 02/09/2026 | R1 e R2 — UI e copy finais |
| **Guia de Testes e Validação — Release #2** | 02/09/2026 | 16 cenários de teste de R2 |

**Regra de precedência:**

1. Para os módulos de **R1 e R2**, quando board e protótipo divergem, **o protótipo prevalece** — ele é posterior e foi construído para validação com o cliente.
2. Para os módulos de **R3, R4 e R5**, vale o board — não há protótipo.
3. Contradições que o protótipo **não resolve** (ou que ele mesmo cria) estão listadas em [07 — Pendências e divergências](prd/07-pendencias-e-divergencias.md) e **não foram decididas por conta própria**.

Cada módulo nos documentos de ambiente traz uma linha **Origem** indicando de qual fonte vieram seus requisitos.

---

## 8. Métricas de sucesso

| Métrica | Definição | Meta |
|---|---|---|
| **Recompra** | % de artistas que submetem uma segunda música após receber o primeiro relatório | ⚠️ A definir com o cliente |
| **SLA de feedback** | % de avaliações entregues em até 72h | Acompanhado no Dashboard Admin |
| **Taxa de compartilhamento** | % de avaliações que resultam em playlist, post ou matéria | Componente do ranking (peso 0,15) |
| **Calibração média da base** | Desvio-padrão médio das notas dos curadores | Faixa saudável: 0,5–1,5 |
| **Devolução por não resposta** | % de Claves devolvidas por curador que não respondeu em 7 dias | Quanto menor, melhor |
| **Uso público do selo** | Menções da Dissona por artistas fora da plataforma | Qualitativo |

---

## 9. Restrições e premissas

- **Plataforma web.** Mobile-first a confirmar. Todos os módulos da V1 estão marcados como "Web" no escopo.
- **Login único** para artista e curador. Não existem telas de login separadas por perfil. Admin tem autenticação à parte, restrita, sem login social e sem autocadastro.
- **Papéis acumuláveis.** A mesma conta pode ser artista e curador.
- **LGPD** aplicável a cadastro, exclusão de conta e exportação de dados.
- **Marketplace:** a plataforma tributa apenas a comissão, não o valor cheio da transação. Exige split de pagamento na origem (ex.: Asaas).
- **IA** usada para gerar o relatório por música e o relatório de evolução do artista. Treinar IA com documentos do cliente foi **descartado** (decisão da R4).
- **Escala prevista:** de 200 para 6.000 curadores. A classificação é automática; o admin decide apenas Prata e Ouro.
- **Terminologia:** usar **"Envios"**, nunca "Submissões", na interface do admin.

---

## 10. Pendências

As pendências do discovery — o que as fontes deixaram em aberto e onde elas se contradizem — estão em [07 — Pendências e divergências](prd/07-pendencias-e-divergencias.md).

A lista consolidada do que **trava implementação**, já cruzada com as decisões técnicas e organizada por release, está em [open-questions](open-questions.md): **8 itens travam a R2** e **5 travam a R1**.
