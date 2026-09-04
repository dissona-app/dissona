# Modelo de negócio — Dissona

Problema, proposta de valor, segmentos, receita, custos e a economia unitária da plataforma.

← [PRD](PRD.md) · [Regras de negócio](prd/01-regras-de-negocio.md) · [Perguntas em aberto](open-questions.md)

---

## 1. Problema

### 1.1 Do lado do artista

Artistas independentes são **mais de 80% do mercado** e não têm acesso a feedback confiável:

- **Feedback raso e sem método.** As plataformas concorrentes entregam avaliação "de cabeça", subjetiva, que frustra em vez de evoluir.
- **Sem diagnóstico.** O artista não sabe se o problema está na afinação, no ritmo, na mixagem, na composição ou na identidade.
- **Sem régua evolutiva.** Não existe base de comparação entre uma faixa e a seguinte.
- **Enviesamento e silêncio.** Amigos e família não criticam; DMs para curadores ficam sem resposta.
- **Investimento às cegas.** Grava e lança sem saber se a música está pronta.
- **Sem credencial.** Não há prova de seriedade que ajude a fechar show ou negociar cachê.

### 1.2 Do lado do curador

- **Escuta não remunerada.** Avalia dezenas de músicas por DM sem retorno financeiro.
- **Sem métrica de qualidade.** As plataformas atuais valorizam **alcance**, não qualidade de curadoria.
- **Pagamento incerto.** Sem regra clara de prazo e liberação.
- **Volume sem filtro.** Recebe solicitação sem contexto e sem triagem.
- **Medo de magoar.** Sem critério objetivo, dar nota baixa é desgaste pessoal.

### 1.3 A tese

O problema dos dois lados é o mesmo: **falta método**. Sem critério explícito, o feedback vira opinião — e opinião não sustenta nem a evolução do artista nem a reputação do curador. A Dissona vende método, não acesso.

---

## 2. Proposta de valor

### 2.1 Para o artista

| Entrega | Como |
|---|---|
| **Diagnóstico objetivo** | 11 critérios em 5 grupos, nota de 0 a 5 com casa decimal, justificativa por item |
| **Leitura humana** | Nota subjetiva + feedback escrito obrigatório, com escuta medida — não existe devolutiva sem audição |
| **Evolução comparável** | Relatórios de IA por música e por artista, faixa a faixa, ao longo do tempo |
| **Credencial de carreira** | Compartilhamento real em playlist, post ou matéria; selo de qualidade Dissona |
| **Tom cordial** | Crítica honesta sem ser destrutiva — *"avaliação como estrada de evolução"* |
| **Prazo garantido** | 72h para repasse cheio; 7 dias sem resposta devolve a Clave automaticamente |

### 2.2 Para o curador

| Entrega | Como |
|---|---|
| **Remuneração clara** | Piso por classe e prazo, acréscimos por opcionais, teto explícito, exibido **antes** de concluir |
| **Reputação mensurável** | Ranking com 4 componentes de peso visível + calibração (desvio-padrão das notas) |
| **Progressão** | Classes Bronze → Prata → Ouro, com remuneração escalonada e reconhecimento público |
| **Método** | Critérios objetivos removem a dependência do gosto — dá lastro para a nota baixa |
| **Demanda organizada** | Fila com prazo visível, contexto do artista e serviços contratados; sem DM |
| **Preço próprio** | O curador define seus serviços e preços em Claves |

### 2.3 O que sustenta o marketplace

A confiança precisa existir **nos dois lados ao mesmo tempo**: o artista confia na curadoria porque há método, calibração e ranking; o curador confia no pagamento porque as regras de prazo e liberação são explícitas e o valor aparece antes da entrega.

**Diferencial estrutural:** o curador é remunerado por **qualidade e pontualidade**, não por alcance. É o que separa a Dissona do concorrente direto (SubmitHub), onde o incentivo é volume.

---

## 3. Segmentos de clientes

### 3.1 Artistas independentes — segmento principal

- Todos os gêneros; **80%+ do mercado musical**.
- Lançam por distribuidora digital, gravam em home studio, divulgam no Instagram.
- **Mercado internacional** é alvo declarado — concorrência direta com o SubmitHub.
- Perfil demográfico detalhado: ⚠️ a definir por pesquisa.

**Persona — Tião Folk, 27 anos.** Proficiência tecnológica média-alta. Envia música pelo **computador, com a banda reunida**; acompanha plays pelo **celular**. Quer plays como credencial para fechar shows, saber onde melhorar antes do próximo lançamento e exibir o selo Dissona como prova de seriedade.

> **Implicação de produto:** o envio precisa funcionar bem no desktop; o acompanhamento, no celular.

### 3.2 Curadores profissionais — segmento complementar

- Playlisters com salvamentos relevantes, blogs, imprensa especializada, canais de YouTube, rádios, A&R, professores, produtores.
- Aquisição por **campanha nacional de contratação**.
- Escala prevista: **de 200 para 6.000 curadores**.

**Persona — João das Couves, 38 anos.** Mantém playlist com 7.500 salvamentos, escreve resenhas em blog e Instagram. Avalia **com fone, em janelas curtas de tempo livre**.

> **Implicação de produto:** a fila precisa ser ordenável por urgência e a avaliação precisa ser **retomável** ("Salvar e sair").

### 3.3 Curador-artista

Uma mesma conta acumula os dois papéis. Login único, troca pelo header. É um segmento por si — o profissional que também lança música.

### 3.4 Gravadoras e selos

Segmento citado no discovery, sem módulo próprio na V1.

⚠️ **Ausência mapeada:** não há persona de **curador classe Ouro**. Os incentivos e o comportamento esperado dessa classe foram desenhados sem uma persona de referência.

---

## 4. Canais

| Canal | Uso |
|---|---|
| **Plataforma web** | Todo o produto. Mobile-first ⚠️ a confirmar |
| **Homepage pública** | Vitrine com SEO: artistas compartilhados, destaques, ranking, CTA de cadastro (R5) |
| **Login social** | Google, Facebook, SoundCloud — reduz atrito de cadastro |
| **Campanha de curadores** | Aquisição do lado da oferta, condição para o marketplace funcionar |
| **E-mail e notificações** | Retenção e cumprimento de SLA |
| **Selo Dissona** | Distribuição orgânica: o artista usa a plataforma publicamente como credencial |

---

## 5. Receita

### 5.1 Fontes

| Fonte | Situação |
|---|---|
| **Venda de pacotes de Claves** com desconto progressivo | V1 — receita principal |
| **Comissão de 50%** sobre as Claves consumidas | V1 |
| **Venda de mídia** — banner dos 100 curadores na homepage | V1 (R5) ⚠️ sem módulo de gestão |
| Planos de assinatura (Essencial / Pro / Premium) | **V2** — adiado |
| Espaço de diálogo áudio/vídeo (Premium) | **V2** — adiado |
| Cursos acionados pelo diagnóstico do feedback | ⚠️ sem escopo fechado |
| Ecossistema de serviços ao artista (modelo Spotify / Mercado Livre) | visão de longo prazo |

### 5.2 Mecânica da Clave

```
1 Clave = R$ 10,00
Pacote  = N Claves com desconto progressivo por volume
Crédito = não expira e vale para qualquer curador
Débito  = só quando o artista confirma a seleção de curadores
```

O preço de cada serviço é definido **pelo curador**, em Claves. Feedback é o serviço padrão e obrigatório; Playlist, Post e Matéria são opcionais e cobrados à parte. Não há limite de curadores por faixa — o teto é o saldo.

### 5.3 Rateio

A plataforma retém **50%** da Clave consumida. O repasse ao curador varia por **classe e prazo**:

| Classe | Piso · em atraso | Piso · no prazo (72h) | Teto (com opcionais) |
|---|---|---|---|
| **Ouro** | 45% | 50% | **62%** |
| **Prata** | 40% | 43% | **55%** |
| **Bronze** | 30% | 38% | **50%** |

Composição do valor: **piso** (classe + prazo) → **acréscimos** por opcionais cumpridos (11 critérios respondidos, justificativa ≥250 caracteres rendendo +3%, feedback ≥150 caracteres, compartilhamento realizado) → limitado ao **teto da classe**. Entrega após 72h limita o acumulado a **50%**.

> ⚠️ **Pendência crítica.** Um curador Ouro no teto recebe 62% — mais que os 50% que a regra de margem reservaria à plataforma. Ou os percentuais incidem sobre outra base, ou os 50% são média e não piso. **A base de cálculo precisa ser definida antes de codar a remuneração.** Ver [open-questions §5](open-questions.md#5-base-de-cálculo-da-remuneração-por-classe).

### 5.4 Passivo e devolução

- **Claves em circulação são passivo** — crédito comprado e ainda não consumido.
- **Devolução automática:** 7 dias sem resposta do curador devolvem a Clave ao artista. Isso é custo de reputação, não receita perdida — mas precisa ser medido.

### 5.5 Tributação

A Dissona é **marketplace**: tributa apenas a comissão, não o valor cheio da transação. Isso exige **split de pagamento na origem** (ex.: Asaas), separando repasse (curador) de comissão tributável (plataforma).

**Invariante contábil:** `repasse + comissão = valor da transação`.

⚠️ O arranjo concreto — split nativo, subcontas por curador ou transferência diferida — está pendente com o contador do cliente.

---

## 6. Estrutura de custos

| Custo | Natureza | Observação |
|---|---|---|
| **Storage e CDN de áudio** | variável | ⚠️ depende da decisão de armazenar o mp3 sempre ou só fora do streaming |
| **Banco de dados e infraestrutura** | semi-fixo | Supabase Postgres, Storage, Edge Functions |
| **Gateway de pagamento** | variável | Taxa por transação + custo de payout ao curador |
| **IA para relatórios** | variável | Por relatório gerado; escala com o volume de avaliações |
| **Campanha de contratação de curadores** | investimento | Condição de partida do marketplace (200 → 6.000) |
| **E-mail transacional** | variável | ⚠️ provedor a definir |
| **Jurídico** | fixo | Termos, direitos autorais, LGPD, contratos com curadores |
| **Moderação e antifraude** | operacional | Julgamento de denúncias e verificação manual de compartilhamento na V1 |
| **Aprovação manual de classe** | operacional | Prata e Ouro passam por decisão humana — escala com a base |

**Dois custos operacionais escalam com o sucesso e merecem atenção:** a fila de aprovação de Prata (mitigada por ações em lote e SLA visível) e a verificação manual de compartilhamento (automatizável só na V2, via Spotify API).

---

## 7. Métricas de sucesso

| Métrica | Definição | Meta |
|---|---|---|
| **Recompra** | % de artistas que submetem uma 2ª música após o primeiro relatório | ⚠️ a definir com o cliente |
| **SLA de feedback** | % de avaliações entregues em até 72h | Acompanhado no Dashboard Admin |
| **Taxa de compartilhamento** | % de avaliações que viram playlist, post ou matéria | Componente do ranking (peso 0,15) |
| **Calibração média da base** | Desvio-padrão médio das notas dos curadores | Faixa saudável: 0,5–1,5 |
| **Devolução por não resposta** | % de Claves devolvidas por silêncio do curador | Quanto menor, melhor |
| **Uso público do selo** | Menções à Dissona por artistas fora da plataforma | Qualitativo |

A definição de sucesso do produto: **o artista submete a segunda música**, a faixa é compartilhada e gera plays, e ele usa a Dissona publicamente como selo de qualidade da carreira.

---

## 8. Posicionamento competitivo

| Eixo | Concorrentes (ex.: SubmitHub) | Dissona |
|---|---|---|
| Base da avaliação | Opinião livre | **11 critérios com nota e justificativa** |
| Incentivo do curador | Alcance e volume | **Qualidade e pontualidade** |
| Prova de escuta | Nenhuma | **Escuta medida pelo player** |
| Reputação do curador | Seguidores | **Ranking + calibração + classe** |
| Evolução do artista | Avaliação isolada | **Relatório comparativo ao longo do tempo** |
| Retorno concreto | Aceite ou recusa | **Compartilhamento real como credencial** |

O fosso não é a tecnologia — é o **banco de dados de evolução dos artistas** que se acumula a cada avaliação, e a base de curadores calibrados que ele treina.

---

## 9. Restrições do modelo

- **Escopo da V1:** 74h (38h de discovery + 36h de UI), com +4h aprovadas pelo cliente mediante o adiamento de Planos/Assinatura (4,5h) e Espaço de diálogo (3,5h) para a V2. Qualquer ampliação exige nova recarga.
- **Marketplace de dois lados:** sem curadores não há produto. A campanha de contratação é pré-requisito, não marketing.
- **Beta começa sem dados.** Métricas, dashboard, catálogo, ranking e homepage precisam de empty states bem tratados — não é detalhe de UI, é a experiência de lançamento.
- **Auditoria de compartilhamento é manual na V1**, por denúncia. A automação via Spotify API só entra na V2.
- **Pacote Premium com feedback em 48h** está no estacionamento de ideias — quando entrar, exige recalcular toda a remuneração por classe.
