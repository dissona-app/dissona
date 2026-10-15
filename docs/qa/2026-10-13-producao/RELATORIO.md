# QA de aceite em produção — Release 1 e 2

**Data:** 13/10/2026 · **Ambientes:** https://dissona.com.br (artista e curador) e https://painel.dissona.com.br (admin)
**Como:** navegador real (Chromium, 1280×800, pt-BR) dirigido pela suíte `pnpm qa` (`qa/jornadas.qa.ts`), com contas novas criadas para o teste. Pagamento em modo **simulado**.

## Resultado

**4 de 4 jornadas aprovadas · 29 de 29 etapas OK** na rodada final (2,6 min).

| # | Jornada | Etapas | Resultado |
|---|---|---|---|
| 1 | Admin → Artista: pacote publicado e comprado | 8 | ✅ |
| 2 | Artista → Curador: envio, escuta, avaliação e devolutiva | 15 | ✅ |
| 3 | Admin → Curador: candidato a Prata em análise | 4 | ✅ |
| 4 | Admin → Artista: pacote desativado sai da vitrine | 2 | ✅ |

Estabilidade medida depois das correções: **40/40** acessos seguidos ao painel e **40/40** ao site, sem erro nem logout.

## Cenários e evidências

As capturas estão em [`capturas/`](capturas/), numeradas na ordem abaixo.

### Jornada 1 · Admin → Artista

| # | Etapa | Tempo |
|---|---|---|
| 01 | Admin entra no painel (`painel.dissona.com.br`) | 6,9 s |
| 02 | Admin abre **Conta e equipe**: vê nome, cargo e e-mail; aba Equipe lista o membro | 3,8 s |
| 03 | Admin cria "Pacote QA" — 30 Claves, 10% de desconto → valor calculado **R$ 270,00**, status Ativo, "Na Carteira do artista" | 7,6 s |
| 04 | Artista novo entra e percorre o **tour de boas-vindas** (4 passos) | 5,2 s |
| 05 | Carteira do artista começa **zerada** | 1,7 s |
| 06 | O pacote do admin **aparece na vitrine** do artista, com preço por Clave | 2,6 s |
| 07 | Checkout com cartão (simulado) → **Pagamento aprovado** | 2,8 s |
| 08 | Saldo credita **+30 Claves** e o extrato registra a compra | 1,2 s |

### Jornada 2 · Artista → Curador

| # | Etapa | Tempo |
|---|---|---|
| 09 | Curador novo entra e cai no **cadastro (wizard de 8 passos)** | 5,1 s |
| 10 | Conclui o cadastro sem credenciais → classificação **Bronze** | 20,2 s |
| 11 | Bronze é liberado na hora: **painel/fila abre** | 2,5 s |
| 12 | Artista envia a faixa **por arquivo (mp3)** — upload direto ao Storage | 13,5 s |
| 13 | Escolhe o gênero e descreve o contexto; revisão mostra tudo | 2,0 s |
| 14 | Seleciona o curador QA e confirma → tela de confirmação | 2,7 s |
| 15 | Status mostra **"Recebeu"**; saldo cai pelo preço do curador (2 Claves) | 3,4 s |
| 16 | A faixa **chega na fila** do curador | 3,4 s |
| 17 | Curador **ouve a faixa** no player (envio vira "Ouviu") | 4,1 s |
| 18 | Inicia a avaliação e dá as **notas objetivas** | 7,2 s |
| 19 | Escreve a **devolutiva** | 2,1 s |
| 20 | Informa o **compartilhamento** e vê a **remuneração** | 1,6 s |
| 21 | **Conclui** a avaliação (envio → "Pronto" no banco) | 1,0 s |
| 22 | Artista vê o envio em **"Pronto"** | 1,3 s |
| 23 | Curador abre a **carteira** | 0,5 s |

### Jornada 3 · Admin → Curador

| # | Etapa | Tempo |
|---|---|---|
| 24 | Curador novo entra e cai no cadastro | 5,3 s |
| 25 | Conclui com **credenciais comprovadas** (links) → **candidato a Prata** | 18,3 s |
| 26 | Fica na **tela de análise**; tentar abrir o painel devolve à análise | 2,6 s |
| 27 | A equipe do admin recebe a notificação **"Curador Prata aguardando aprovação"** | 5,7 s |

> A tela em que o admin **aprova** o curador é da Release 3 (no menu: "Curadores e artistas — Em breve"). Fora do escopo.

### Jornada 4 · Admin → Artista (desativar)

| # | Etapa | Tempo |
|---|---|---|
| 28 | Admin **desativa** o pacote → "Fora da Carteira" | 6,6 s |
| 29 | O pacote **some da vitrine** do artista | 8,3 s |

## Problemas encontrados (e situação)

| # | Gravidade | Problema | Situação |
|---|---|---|---|
| 1 | **Crítico** | **Compra de Claves dava erro 500** em produção (4/4 tentativas). Causa: `SUPABASE_SERVICE_ROLE_KEY` não existia como variável de **tempo de execução** nos Workers (estava só nas variáveis de *build*). | ✅ Corrigido — segredo adicionado no dissona-web e no dissona-admin. Compra validada. |
| 2 | **Crítico** | **238 pacotes de teste** (`e2e_…`) apareciam na vitrine do artista ao lado dos 3 reais. | ✅ Corrigido — exclusão lógica (`excluido_em`). |
| 3 | Alto | Durante a tarde, **~25–50% dos acessos** falhavam em produção: 503, "This page couldn't load" ou **logout falso** (volta ao login/início). Logs: "Worker exceeded CPU time limit" (plano gratuito do Workers, 10 ms de CPU). | ⚠️ Na medição final: 80/80 OK. O risco continua enquanto o plano for o gratuito — recomendado o **Workers Paid (US$ 5/mês)** antes da apresentação. |
| 4 | Médio | **7 pacotes "Pacote QA …"** de rodadas anteriores do QA continuam **ativos** na vitrine. | ⏳ Rodar o SQL abaixo. |
| 5 | Médio | No **dissona-admin**, a `SUPABASE_SERVICE_ROLE_KEY` foi cadastrada como **Variável** (valor visível no painel), não como Segredo. | ⏳ Editar → tipo Segredo. |
| 6 | Baixo | `SOUNDCLOUD_LIGADO=false` foi para o dissona-admin; quem lê é o **dissona-web**. Sem ela, o botão "Entrar com SoundCloud" aparece no site e falha (provedor não configurado). | ⏳ Adicionar no dissona-web. |
| 7 | Baixo | "Teste de Pacote" (200 Claves, 90% de desconto, R$ 1,00/Clave) está ativo na vitrine. | ❓ Confirmar se deve aparecer na demonstração. |
| 8 | Baixo | Na vitrine, o **nome do pacote não aparece** no cartão (só no rótulo de acessibilidade do botão "Escolher"). | 📝 Decisão de design — avaliar. |

### SQL para o item 4

```sql
update pacote_clave set ativo = false
where excluido_em is null and nome like 'Pacote QA %';
```

## O que não foi coberto

- **Cadastro pela tela** e **recuperação de senha**: dependem de e-mail, e o SMTP do Supabase está no limite padrão (~2 e-mails/hora). As contas de teste nascem pela API de admin, em domínio que não recebe e-mail.
- **Login com SoundCloud**: provedor não configurado no Supabase.
- **Pagamento real (Asaas)**: produção está em modo simulado, como combinado.
- **Aprovação de curador Prata pelo admin, financeiro, moderação**: Release 3+.

## Usuários de teste

Criados nesta rodada e **mantidos** para a demonstração (já com histórico):

| Perfil | E-mail | Entrar em |
|---|---|---|
| Admin (Administrador) | `qa_admin_10132001@e2e.dissona.local` | https://painel.dissona.com.br/entrar |
| Artista (saldo 28 Claves, 1 faixa avaliada) | `qa_artista_10132001@e2e.dissona.local` | https://dissona.com.br/artista/entrar |
| Curador Bronze (1 avaliação concluída) | `qa_curador_10132001@e2e.dissona.local` | https://dissona.com.br/curador/entrar |
| Curador candidato a Prata (em análise) | `qa_curador_prata_10132001@e2e.dissona.local` | https://dissona.com.br/curador/entrar |

As **senhas** estão em `qa/resultado/usuarios.md` (local, fora do git).

As rodadas anteriores do QA deixaram 68 contas `qa_*` antigas, sem uso; podem ser apagadas.

## Como repetir

```bash
pnpm qa
```

Cria contas novas, roda as 4 jornadas e grava capturas, log de etapas e respostas 5xx em `qa/resultado/`.
