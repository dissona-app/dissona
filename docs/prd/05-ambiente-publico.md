# 05 — Ambiente Público

Um módulo, 8h. Web.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

> **User story:** *Como visitante, quero descobrir artistas e curadores em destaque, para conhecer a Dissona e me cadastrar.*

| # | Módulo | Release | Discovery | UI | Total |
|---|---|---|---|---|---|
| 26 | Homepage pública | R5 | 3h | 3,5h | 6,5h |
| 26.6 | Convite / CTA (artista) | R5 | 0,5h | 1h | 1,5h |

---

## 26. Homepage pública

**Release 5 · 8h · Origem: board (módulo novo da V3.1)**

> ⚠️ **Este módulo não tem "Critérios de aceite", "Notificações" nem "Impactos em outros módulos" preenchidos no board** — os blocos existem, mas estão vazios. O mesmo vale para a "User story" do ambiente público. Os critérios abaixo estão marcados como **derivados** e precisam ser validados com o cliente. Ver [pendência 10](07-pendencias-e-divergencias.md).

### Objetivo

Vitrine pública, **sem login**, com foco em SEO e aquisição. Auto-alimentada pelo que acontece na plataforma, e com espaço para venda de mídia.

### Telas

| # | Tela |
|---|---|
| 26 | Home (pública) |
| 26.1 | Artistas Compartilhados |
| 26.2 | Detalhe do artista compartilhado |
| 26.3 | Artistas em Destaque (matéria) |
| 26.4 | Ranking de Curadores |
| 26.5 | Banner 100 curadores |
| 26.6 | Convite / CTA (artista) |

### 26 · Home (pública)

**Estrutura:**
- **Hero** + botão CTA → *"Enviar minha música"*
- Seção **Artistas Compartilhados**
- Seção **Destaques**
- Seção **Ranking**
- **Login / Cadastro** (Entrar · Criar conta)

### 26.1 · Artistas Compartilhados

Grade de artistas cujas músicas foram compartilhadas por curadores — a seção é **auto-alimentada** pelo módulo 14.2 (Compartilhamento). Ao clicar, abre 26.2.

### 26.2 · Detalhe do artista compartilhado

Página do artista compartilhado, com a faixa e o contexto do compartilhamento.

### 26.3 · Artistas em Destaque (matéria)

Artistas em destaque e curadores em destaque, alimentados pelas matérias publicadas.

### 26.4 · Ranking de Curadores

Top curadores e top faixas, alimentados pelas Métricas de Performance (16).

### 26.5 · Banner 100 curadores

Espaço de destaque para os 100 curadores — **venda de mídia**.

### 26.6 · Convite / CTA (artista)

Bloco de chamada ao lado da grade da Home, voltado ao **artista externo**. Convite emocional, na voz da marca, que leva ao cadastro.

**Headline em uso:**
> **"O que você fez pela sua música hoje?"** → *Enviar minha música*

**Alternativas registradas no discovery:**
| # | Headline | CTA |
|---|---|---|
| 1 | "O que você fez pela sua música hoje?" | Enviar minha música ← **em uso** |
| 2 | "Onde está a sua jornada?" | Começar agora |
| 3 | "Sua música merece ser dissonada." | Quero ser dissonado |

### Critérios de aceite ⚠️ *derivados — validar com o cliente*

- [ ] Visitante acessa a home **sem login** e vê as seções Compartilhados, Destaque e Ranking.
- [ ] Clicar em um artista compartilhado abre o detalhe (26.2).
- [ ] O ranking de curadores reflete os dados do módulo 16.
- [ ] A seção de compartilhados é alimentada automaticamente pelo módulo 14.2.
- [ ] O CTA leva ao Cadastro (1.1) e, dali, à Seleção de perfil (1.4).
- [ ] O banner dos 100 curadores é gerenciável pelo admin (venda de mídia).

### Notificações ⚠️ *não preenchido no board*

Nenhuma notificação foi definida para este módulo. Módulo público, sem usuário autenticado — a expectativa é que **não emita nem consuma notificações**, mas isso **não está confirmado**.

### Impactos em outros módulos ⚠️ *derivados*

- Consome compartilhamentos do módulo **14.2 / 14.3** (seção Artistas Compartilhados).
- Consome ranking do módulo **16**.
- Encaminha para **Autenticação (1)** — login e cadastro.
- O user flow do admin cita **"Gestão da Homepage & Mídia"**, que **não tem módulo correspondente no escopo da V1**. Ver [pendência 11](07-pendencias-e-divergencias.md).

### Regras

- Vitrine pública (R5), **sem login** — foco em SEO e aquisição.
- Seções: Compartilhados · Destaque · Ranking.
- **Auto-alimentada** pela atividade da plataforma + **venda de mídia** (banner).
- Tom emocional, voz da marca, no bloco de convite.
