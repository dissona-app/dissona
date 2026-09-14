# 07 — Pendências e divergências

Tudo o que **não foi decidido** neste PRD, porque a decisão não é do time de produto ou porque as fontes se contradizem. Nenhum item aqui foi resolvido por suposição.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

---

## Parte A — Pendências bloqueantes

Itens em que o produto **se comporta de forma diferente** conforme a resposta. Precisam de decisão antes da implementação do módulo correspondente.

### 1. ⚠️ Escuta mínima: 60% ou 100% da faixa?

| Fonte | O que diz |
|---|---|
| Protótipo **Curador**, tela de avaliação | *"A escuta é medida. A avaliação só é aceita a partir de **60%** da faixa ouvidos."* |
| Protótipo **Artista**, login | *"...100% da faixa ouvida"* |
| Protótipo **Artista**, onboarding | *"O curador ouve do início ao fim antes de escrever qualquer coisa. A escuta é medida: sem ela, não sai devolutiva."* |
| Board V4 | *"player mede tempo mínimo de escuta"* — **sem número** |

**Por que é bloqueante:** as duas telas são da mesma release e a promessa é **visível ao usuário final**. Se o gate real for 60%, a home do artista está prometendo algo que o sistema não exige.

**Impacto:** módulo 14 (regra de aceite da avaliação) e copy do módulo 1 (artista).
**Decisão de:** cliente.

### 2. ⚠️ Pesos do ranking: tabela ou diagrama?

O discovery V4 (pág. 13) traz **duas versões dos pesos** do ranking — uma na tabela e outra no diagrama. O PRD adotou a versão da tabela:

```
Ranking = (média das notas ÷ 5)        × 0,25
        + (feedbacks no prazo ÷ total) × 0,33
        + (calibração: desvio ÷ 2,0)   × 0,27
        + (% de compartilhamentos)     × 0,15
```

**Impacto:** módulos 16 (Métricas), 20.4 (Dossiê), 4 (exibição no card do curador), 24 (calibração média).
**Decisão de:** cliente / time de discovery. **Conferir a fonte original.**

---

## Parte B — Divergências entre board e protótipo

O protótipo da R2 é posterior ao board e foi construído para validação com o cliente. Onde ele decide, o PRD segue o protótipo — mas o registro fica aqui para que a diferença seja consciente.

| # | Tema | Board (V4) | Protótipo R2 | Adotado |
|---|---|---|---|---|
| 3 | **Liberação do crédito** | *"Crédito só é liberado após o compartilhamento confirmado — a plataforma precisa monitorar"* | *"O crédito é liberado nos dois caminhos"* (compartilhando ou declarando que não vai) | **Protótipo** ⚠️ ver nota abaixo |
| 4 | Formato de envio | mp3 | **WAV e MP3, até 50 MB** | Protótipo |
| 5 | Fluxo de envio | 3 → 3.1/3.2 → 3.3 | **Wizard de 3 passos** + campo novo *"O que o curador precisa saber?"* | Protótipo |
| 6 | Cadastro do curador | 6 telas (12 a 12.5) | **8 passos** | Protótipo |
| 7 | Papéis do admin | "Administrador, Financeiro, Curadoria…" | **Administrador · Moderador · Financeiro · Suporte** | Protótipo |
| 7b | Navegação do admin | — | **Início · Gestão** (Curadores e artistas, Pacotes de Claves) **· Operação** (Financeiro da plataforma, Moderação e antifraude) **· Conta** (Conta e equipe) | Protótipo — a R0 havia derivado outros grupos e dois itens que o protótipo não tem |
| 7c | Granularidade da permissão | um booleano por módulo, em 4 módulos | `permissao_admin` tem `pode_ler` **e** `pode_escrever`, em 6 módulos (`pacotes` e `configuracao` separados de `financeiro`) | **Tabela**, com o booleano do protótipo semeado em `pode_escrever`. A granularidade maior fica disponível para quando o cliente a exercer |
| 8 | Pacotes de Claves | criar / editar / excluir | acrescenta **status ativo/inativo**, preço por Clave calculado, **log de alteração** e a regra "só ativos aparecem na Carteira" | Protótipo |
| 9 | Estados do saldo | saldo + extrato | acrescenta **"Comprometidas em análise"** e **"Devolvidas por falta de resposta"** | Protótipo |

### Parte B.1 — Onde o protótipo **não** venceu, e por quê

Registro das vezes em que a implementação se afastou do protótipo de
propósito. A precedência do [AGENTS.md](../../AGENTS.md) põe o protótipo acima
de qualquer derivação, então cada uma destas precisa de razão explícita.

| Tela | Protótipo | Implementado | Razão |
|---|---|---|---|
| 1 · login do artista | prova social *"100% da faixa ouvida"* | *"escuta medida e registrada"* | A tela de avaliação **do mesmo protótipo** diz "a avaliação só é aceita a partir de 60% da faixa ouvidos". Prometer 100% na porta de entrada é uma promessa que o produto não cumpre. Ver [perguntas ao cliente](../R2/perguntas-ao-cliente.md). |
| 21.1 · criar pacote | `salvarPacote()` **coage em silêncio**: nome vazio vira `"Pacote 30 Claves"`, quantidade inválida vira `30`, desconto inválido vira `5`, e valor acima da base é capado | erro no campo, e não salva | Comportamento de mock. O cenário **A2** do guia de testes pede o contrário — *"Validações barram valores/percentuais inválidos"* — e o guia é o gate. Salvar um preço que não foi o digitado é pior que recusar. |
| 21 · lista de pacotes | o `flash` de confirmação desaparece em 2,6 s | permanece até a próxima ação | Confirmação que se apaga sozinha é inútil para quem lê devagar. O `role="status"` já a anuncia ao leitor de tela sem interromper. |

E uma divergência que o protótipo criou contra si mesmo, resolvida a favor da
copy: a tela 21 tem **Desativar** e **Excluir** como ações distintas, com o
modal dizendo *"Se a ideia for só tirar de circulação, desative"* — mas a
`0007` havia colapsado as duas em `ativo = false`, o que tornaria a frase
falsa. Resolvido com `pacote_clave.excluido_em` na `0007b`; ver
[data-model §`pacote_clave`](../data-model.md).

### Parte B.2 — Telas de Conta e a tela 12.6

Três decisões da fatia de credenciais e segurança que merecem registro.

| Tela | Protótipo | Implementado | Razão |
|---|---|---|---|
| 7.2 / 7.4 · 17.2 / 17.4 · abas | `<button>` com estado local; só o ambiente do artista tem `role="tablist"` (design-system §4.6) | links que trocam `?aba=` | A aba passa a ter endereço, e a própria copy o exige — *"gere outro em Configurações › Segurança"* é uma frase que precisa ser linkável. Além disso a tela funciona sem JavaScript, e o servidor lê as sessões só para quem abriu a aba de segurança. A aparência é idêntica; o que muda é o elemento, e para navegação de verdade o elemento certo é `<a>` com `aria-current`, não `role="tab"` — que promete um painel trocando no lugar. |
| 7.4 / 17.4 · sessões ativas | *"Chrome · São Paulo"* | *"Chrome · Windows"*, com o IP na linha de apoio | `auth.sessions` guarda `ip` e `user_agent`, não cidade. Resolver o IP exigiria um serviço externo por linha, e um "São Paulo" errado num painel cuja função é reconhecer acesso indevido é pior que nenhum lugar. O sistema é a outra coisa que a pessoa reconhece de bater o olho, e essa é verdadeira. Ver o cabeçalho da migration `0001d`. |
| 7.4 / 17.4 · exclusão, passo 1 | "Continuar" avança sem exigir a exportação | idem | Registrado por ser deliberado: exigir o download antes de sair seria cobrar pela saída, e o direito da LGPD é o de **levar** os dados, não o de recebê-los à força. |

**12.6 não existe no protótipo.** A tela entrou na V3.1 do discovery, e a
sidebar do curador aponta "Meu cadastro" para o wizard. O conteúdo vem do
[PRD §12.6](03-ambiente-curador.md) — tabela de mídias com nome, tipo e link;
inserir, editar e excluir com confirmação; editar serviços e preços — e a forma
reaproveita os cards e a lista de serviços do módulo 12. Ela ganhou rota própria
(`/curador/meu-cadastro`) porque `/curador/cadastro` é a **retomada** do wizard
e manda quem já concluiu para a classificação: apontar "Meu cadastro" para lá
faria o item da sidebar abrir a tela de parabéns do Bronze.

### Parte B.3 — A matriz de permissões (27.4)

O protótipo tem **uma** caixa por célula. A tabela `permissao_admin` tem
`pode_ler` **e** `pode_escrever` — granularidade adotada na divergência 7c, com
a nota de que "fica disponível para quando o cliente a exercer". A tela que a
edita é a única que pode exercê-la, e uma caixa não expressa dois booleanos.

As três saídas possíveis, e por que duas não servem:

| Saída | Consequência |
|---|---|
| A caixa governa só `pode_ler` | `pode_escrever` fica **congelado no seed para sempre**: nenhum papel jamais ganha escrita em módulo nenhum, e o caminho de negação de escrita nunca é exercido de propósito |
| A caixa governa as duas | Desligar e religar dá **escrita** a quem só tinha leitura, sem ninguém pedir. É escalonamento de privilégio por acidente de interface |
| **Adotada:** a célula é um `<select>` de três níveis — Sem acesso · Ver · Ver e editar | O grid é o do protótipo (mesmas quatro linhas, mesmas quatro colunas, mesmas descrições); o controle é o que a tabela exige. Nada se perde e nada escala sozinho |

Duas invariantes seguem travadas em três camadas — na tela sem controle, na RPC
com `DS020`, na policy com `tem_permissao('equipe', true)`:

- **`administrador` não é editável.** É o que o pé da tela promete: *"Administrador
  mantém acesso total, inclusive a equipe e papéis."* Um administrador que se
  cortasse de `equipe` trancaria a organização fora da própria gestão.
- **`equipe` é exclusiva do administrador.** É a permissão que concede
  permissões; dá-la a outro papel é dar o papel de administrador com outro nome.

`pacotes` e `configuracao` existem na tabela e **não** nesta tela — o protótipo
tem quatro módulos. Eles seguem governados pelo seed da `0003` em vez de serem
zerados por omissão quando esta tela salva.

**Duas outras decisões de 27.2**, menores e igualmente deliberadas: o `<select>`
de papel salva por formulário com um botão "Aplicar", e não no `change` — custa
um clique, faz a linha funcionar sem JavaScript e evita a troca acidental de
quem rola a lista com o teclado sobre o select. E `/admin/convite` é indiferente
à sessão, porque `exigirSessao` monta o `?proximo=` a partir do *pathname*:
redirecionar quem chega sem sessão a traria de volta sem o token do convite.

### Nota sobre a divergência 3

Esta é mais séria do que uma diferença de UI. O board condiciona a liberação do crédito ao compartilhamento **confirmado e monitorado** (conectando explicitamente com o módulo 23 de antifraude). O protótipo libera o crédito na conclusão da avaliação, em qualquer caminho — o compartilhamento apenas **remunera mais**.

O PRD adotou a regra do protótipo, mas ela **enfraquece o controle antifraude** que o board previa: o curador pode prometer compartilhar, receber o acréscimo e não cumprir, e o único mecanismo de correção é a denúncia posterior (23.1). **Confirmar com o cliente** se o acréscimo por compartilhamento deve ficar retido até verificação.

---

## Parte C — Pendências abertas no board

Itens que o discovery já registrou como não resolvidos.

### 10. Armazenamento do arquivo de áudio

Armazenar o mp3 **sempre**, ou **só quando a música não está no streaming**? (V4 pág. 9–11)
**Impacto:** módulo 3, custo de storage (S3), estrutura de dados da música.
**Decisão de:** cliente + dev.

### 11. Critérios definitivos de classe

Os thresholds de classificação (≥2 credenciais para Prata; ≥60 curadorias, 2 ciclos, score ≥0,85 para Ouro) estão marcados como **configuráveis** e **pendentes de validação** do cliente.
**Impacto:** módulos 12.4, 16.1, 20.3, 20.4.

### 12. Bronze → Prata é por credenciais, não por performance

O board registra: *"Bronze→Prata é por credenciais (não performance) — confirmar com o cliente."* Isso significa que um curador Bronze com desempenho excelente **não sobe de classe** enquanto não apresentar credenciais.
**Impacto:** módulo 16.1 (o que o Bronze vê como caminho de evolução).

### 13. Política mínima de senha ✅ *resolvida pelo protótipo*

O board deixou "a definir com dev". O protótipo definiu: **8 caracteres ou mais, com pelo menos 1 número**. Token de recuperação: 60 minutos, uso único. Verificação de e-mail: 24 horas.
**Status:** resolvida — mas **confirmar com dev** se atende à política de segurança.

### 14. Papéis e permissões do admin

O board registra: *"Módulo novo (V3.1). Papéis e permissões a detalhar com o cliente."* O protótipo nomeou quatro papéis, mas **não definiu a matriz de permissões por módulo**.
**Impacto:** módulo 27.4.

### 15. Monitoramento do compartilhamento prometido

Pendência técnica. Na V1 a auditoria é **manual, por denúncia**. A auditoria automática via **Spotify API** só entra na V2.
**Impacto:** módulos 14.2, 23. Relacionado à divergência 3.

### 16. Detecção de salvamentos da playlist do curador

Depende de integração com o Spotify (ou equivalente). O número de salvamentos aparece no card do curador (módulo 4) e no cadastro (12.1) — **sem a integração, o dado não existe**.
**Impacto:** módulos 4, 12.1.

### 17. Ativação do 2º papel "depende de aprovação da curadoria"

O protótipo do artista, em Conta › Dados da conta, diz: *"Ativar papel de curador — os papéis se acumulam... **Depende de aprovação da curadoria**."*

Esse fluxo de aprovação **não está descrito no board**. O board diz apenas que o 2º papel é ativado em Conta e configurações e leva ao Cadastro de curador (12) — onde a classificação Bronze é automática.

**Pergunta:** ativar o papel de curador leva ao fluxo normal do módulo 12 (com Bronze auto-aprovado), ou existe uma aprovação adicional?
**Impacto:** módulos 7.2, 12.

### 18. Homepage pública sem critérios de aceite

Os blocos "Critérios de aceite", "Notificações" e "Impactos em outros módulos" do módulo 26 estão **vazios no board**, assim como a "User story" do ambiente público. Os critérios em [05 — Ambiente Público](05-ambiente-publico.md) foram **derivados** das funcionalidades e precisam de validação.
**Impacto:** módulo 26 (8h, a maior peça isolada da R5).

### 19. "Gestão da Homepage & Mídia" não tem módulo

O user flow do admin inclui o passo **"Gestão da Homepage & Mídia"**, e o módulo 26 prevê **venda de mídia** no banner dos 100 curadores. Mas **não existe módulo de gestão de homepage no escopo da V1** — nem horas alocadas.

**Pergunta:** quem cadastra os destaques, a matéria e o banner? É trabalho manual/banco, ou precisa de tela?
**Impacto:** escopo da R5 — pode ser trabalho não orçado.

---

## Parte D — Restrição de projeto

### 20. Banco de horas

| Item | Valor |
|---|---|
| Escopo total mapeado | **82h** |
| Horas vendidas originalmente | **70h** |
| Saldo previsto no fechamento original | **−12h** |
| Ajuste feito | Planos/Assinatura (4,5h) e Espaço de diálogo (3,5h) adiados para a V2 |
| Banco recarregado para | **74h** — **+4h aprovadas pelo cliente** |

**Consequência:** qualquer ampliação de escopo na V1 — incluindo a resolução da pendência 19 com uma tela nova — exige **nova recarga de horas**.

### 21. Inconsistência na tabela de horas da Release 1

A tabela da Release 1 no board declara **Total 16,75h**, mas a soma das suas linhas dá **14,75h** — diferença de exatamente 2h.

**Causa identificada:** a linha "Autenticação · Artista e Curador · 2h" aparece **uma única vez**, embora o escopo aloque **2h para o ambiente Artista e 2h para o ambiente Curador**. É a única leitura que faz os totais por ambiente fecharem (Artista 26,5h e Curador 22,5h incluem, cada um, 2h de Autenticação) e o total geral dar 74h.

**Adotado neste PRD:** R1 = **16,75h**, com Autenticação listada duas vezes. **Confirmar** que essa é a intenção — se a Autenticação for de fato 2h no total, a V1 tem 72h e não 74h, e sobram 2h no banco.

---

## Parte E — Riscos operacionais mapeados

Não são pendências, são riscos já identificados com mitigação definida. Ficam aqui para acompanhamento.

| Risco | Mitigação definida | Módulo |
|---|---|---|
| **No-show de curador** | Exibir disponibilidade/carga ("responde em ~Xh", "fila cheia"); permitir que o curador sinalize lista de espera | 4, 17 |
| **Confusão ranking × classe** | Separar visualmente + tooltip explicando o que cada um mede | 4, 16 |
| **Fila de aprovação Prata** na escala 200→6.000 | Ações em lote + SLA visível; sugestão do cliente: anunciar um **evento de avaliação geral** em data definida | 20.3 |
| **Limbo do candidato a Ouro** | Dossiê com limite de adiamentos / prazo de decisão | 20.4 |
| **Denúncia retaliatória** | Penalidade só após julgamento procedente | 23.1 |
| **Empty states no lançamento** | No beta tudo começa "sem dados" — tratar explicitamente em Métricas, Dashboard, Catálogo e Homepage | 2, 6, 16, 24, 26 |
| **Conta ou credencial falsa de curador** | Exigir credencial com link/evidência verificável + amostragem na aprovação | 12.3, 20.3 |
| **Avaliações em massa** | Mitigado pela calibração (desvio-padrão penaliza compressão de notas) | 16, 23 |

---

## Estacionamento de ideias

Registradas no discovery, fora do escopo da V1:

- **Pacote Premium de classes** promete feedback em 48h — exigirá recalcular a remuneração por classe quando entrar.
- **Validação automática de compartilhamento** após o feedback do curador (V2). Em primeiro momento, será manual.

---

## Divergências levantadas pela implementação do banco · 2026-09-08

Registradas aqui porque a precedência do [AGENTS.md](../../AGENTS.md) —
**protótipo da R2 > board > derivação** — as resolveu a favor do protótipo, e o
banco já reflete isso. Cada uma tem o detalhe no cabeçalho da migration que a
causou.

| # | O que divergia | Decidido | Onde |
|---|---|---|---|
| 1 | O grupo Produção não tinha item nomeado | Tem **dois**: Mixagem e Arranjo. O board perdeu dois itens, não um | `0008` |
| 2 | Quais cinco critérios são obrigatórios | afinação, ritmo, melodia, personalidade, conexão — **não** um por grupo | `0004` |
| 3 | Escuta mínima 60% × 100% | **60%**; a copy do artista é que muda | `0004` |
| 4 | Semântica de `remuneracao.*` | *(piso, teto na avaliação, teto com compartilhamento)*, e não *(atraso, prazo, teto)*. **RF-066 foi corrigido** | `0004`, `0009` |
| 5 | Penalidade de atraso | −8 pontos no **piso**, mínimo 15. `teto_atraso_percentual` deixou de existir | `0004`, `0009` |
| 6 | `evento_notificacao.destinatario` | `papel[]`, e não escalar: cinco eventos servem artista e curador | `0005` |
| 7 | `log_auditoria.registro_id` | `text`, e não `uuid`: `lancamento_clave.id` é `bigint` | `0003` |
| 8 | Faixa das migrations | `0011` são os jobs de R1+R2; a R3 começa em `0012` | `0011` |

### E uma divergência interna do próprio protótipo

Sobre o **acréscimo por compartilhamento** ([#8](../open-questions.md)), o
protótipo se contradiz: a copy do passo diz *"a equipe confere o registro antes
de liberar o acréscimo"*, mas o cálculo soma os 8 pontos na hora, e o cenário
**C5** do Guia de Testes afirma que *"o crédito é liberado ao confirmar"*.

Adotado o **cálculo**, que é o comportamento observável, com
`configuracao.compartilhamento.acrescimo_retido = false`. O `ganho_curador`
grava o item como `{"chave":"compartilhou","percentual":8,"retido":false}`, para
o histórico continuar interpretável se a decisão virar.


---

## Divergência levantada pela pesquisa da API do SoundCloud · 2026-09-10

O protótipo promete, no pé do cadastro: *"Google, Facebook ou SoundCloud
preenchem seu nome e e-mail. Você confirma antes de criar."* Para o SoundCloud,
a segunda metade é impossível — não por decisão nossa, mas porque a API não tem
o campo.

| Fonte | O que diz |
|---|---|
| Protótipo **Artista**, cadastro (1.1) | *"Google, Facebook ou SoundCloud preenchem seu nome e e-mail"* |
| OpenAPI oficial do SoundCloud (`soundcloud/api`, `openapi/api.yaml`) | o schema `Me` tem `full_name`, `first_name`, `last_name`, `permalink_url`, `urn`, `plan` e `primary_email_confirmed` — **um booleano**, não o endereço. Campo `email` não existe, e não há scope que o libere |

**Por que importa:** a frase é visível ao usuário final e promete menos atrito
do que o provedor entrega. Pior, aqui o e-mail não é um campo de perfil: é o
identificador da conta e o canal de verificação, recuperação e SLA.

**Não decidido por suposição.** As duas saídas dependem do cliente
([#9](../open-questions.md#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail)):
pedir o endereço numa tela a mais — `/cadastrar/confirmar` já existe para o que
o social não colhe — ou oferecer o SoundCloud só como **login** de quem já tem
conta, corrigindo a copy nas duas telas.

**Impacto:** módulo 1 (artista), copy das telas 1 e 1.1, RF-002.

### E dois deveres que o ToS deles cria

O [ToS da API](https://developers.soundcloud.com/docs/api/terms-of-use) exige um
mecanismo **acessível** de desconectar a conta SoundCloud e o **expurgo dos
dados pessoais em até 7 dias** a partir dela — *"without undue delay, but in any
case within 7 days"*. Nenhum dos dois estava nos requisitos; entraram em RF-002.
O uso comercial também é discricionário: o que eles proíbem é *"in-app purchases
which allow access to content or features already available via the SoundCloud
platform"*, e Claves compram curadoria, que não existe lá dentro — o argumento é
bom, mas a decisão de revogar acesso é deles.

---

## Divergências de composição levantadas pela comparação visual · 2026-09-11

A suíte `e2e/prototipo/telas-de-autenticacao.spec.ts` abre cada tela de
autenticação no protótipo e na aplicação, no mesmo navegador, e compara a
tipografia de todo texto que existe nos dois lados. O que ela achou e não foi
corrigido está aqui; o resto virou correção de CSS no mesmo commit.

### 1. A tela de verificação de e-mail é outra composição no protótipo

| Fonte | O que faz |
|---|---|
| Protótipo **Artista**, verificação | bloco de **560 px alinhado à esquerda**, sobre **fundo branco**, com ícone de envelope, `<h1>` de **40 px**/`1.06`, texto de apoio de 16 px e **sem rodapé** de Termos/Privacidade. Os dois botões ficam lado a lado, com largura de conteúdo |
| Aplicação, `/verificar-email` | cartão de 436 px **centralizado** sobre o gradiente de auth, `<h1>` de 24 px, botões em bloco inteiro, rodapé da moldura |

A aplicação unificou a tela na `MolduraDeAutenticacao` das outras telas de auth
— a mesma unificação que o protótipo pediu no `gap` do cartão (comentário em
`MolduraDeAutenticacao.tsx`). O efeito colateral é visível: em 436 px o título
quebra em *"Confirme seu e-/mail para continuar"*.

**Não decidido por suposição:** ou o protótipo desenhou uma moldura larga que
vale para mais telas (e a de confirmação neutra e a de senha redefinida também
a querem), ou a unificação está certa e o protótipo é que tem uma tela fora do
padrão. É decisão de design, não de implementação.

**Enquanto não se decide:** a divergência está declarada como exceção no
cenário de verificação do spec, com este parágrafo como motivo. O corpo do
título continua o da moldura; o resto da tipografia da tela já bate.

### 2. Onboarding (1.5) e seleção de perfil (1.4) fora da comparação

As duas exigem sessão, e a suíte de paridade abre as telas sem autenticar —
então ainda não há cenário para elas. A leitura manual do protótipo mostra pelo
menos duas divergências a confirmar quando entrarem:

- o `<h1>` do onboarding é o **hero** (`clamp(31px,4.4vh,42px)`/`1.04`), e a
  aplicação usa `clamp(24px,3.2vh,30px)`;
- o contador "Passo N de 4" é `ink-500` no protótipo e `purple-600` na
  aplicação — o mesmo erro de cor que as outras telas de auth tinham.

### 3. O protótipo se contradiz em dois detalhes de tipografia

Nenhum dos dois é bug da aplicação; ficam registrados para não serem
"corrigidos" de novo no futuro:

- **`letter-spacing` de rótulo de botão.** A tela 1 usa `-0.01em`, e é o valor
  que o Design System registra (§1.2). As telas de verificação e de link
  inválido não põem `letter-spacing` nenhum. A aplicação segue o token nas
  duas, e o spec declara a exceção.
- **Corpo do botão social.** 13 px na tela 1 e 14 px na tela 1.1, no mesmo
  componente. Aqui a aplicação **segue o protótipo tela por tela**, pelo prop
  `tamanho` de `BotoesSociais` — a diferença acompanha o papel do social em
  cada tela (atalho no login, alternativa no cadastro).

---

## Divergências das telas da R1 com sessão · 2026-09-11

Segunda passada da comparação visual, agora nas telas que exigem login
(`e2e/prototipo/telas-da-r1.spec.ts`): onboarding, conta do artista e do
curador, os oito passos do wizard, classificação, Bronze, análise e a conta e
equipe do admin. A maioria do que ela achou era **escala de tipografia** e virou
correção; o que segue divergindo está aqui.

### 1. Os dois botões da tela de Bronze estão com as variantes trocadas

No protótipo, "Começar o curso" é o primário (branco sobre laranja) e "Ir para o
painel" é o secundário (roxo sobre branco). Na aplicação o curso está
**desabilitado** — o conteúdo é de outra release —, e com isso "Ir para o
painel" assumiu o primário. É a decisão certa enquanto o curso não existir: a
tela não pode ter como ação principal um botão que não leva a lugar nenhum.
Quando o curso entrar, os dois voltam ao protótipo.

### 2. A nota da tela de análise é um `Aviso`, e no protótipo é texto solto

*"A equipe já recebeu o alerta para avaliar suas credenciais"* aparece num aviso
informativo roxo; no protótipo é uma linha de 12 px em `ink-500`. O aviso dá
mais peso à frase do que o protótipo lhe dá. Decisão de design, não de
implementação.

### 3. O upload de foto do admin é pendência, e o botão está desabilitado

"Trocar foto" sai cinza em vez de roxo por estar desabilitado — o protótipo, ao
clicar nele, ele mesmo diz *"Upload de imagem indisponível no protótipo"*.

### 4. Dois verdes de sucesso quase iguais no próprio protótipo

O status "Completo" da revisão (passo 8) usa `#1B7A46`; as outras telas usam
`#1E7A4A`. Os dois estão no §1.1 do Design System, com 4,76:1 e 4,74:1 de
contraste. A aplicação segue o token `--dsn-success-fg`; um segundo token para
0,02 de diferença de contraste seria ruído.

### 5. Onde o protótipo ainda não foi lido

- **Telas derivadas**, sem protótipo nenhum com que comparar: seleção de perfil
  (1.4), `/cadastrar/confirmar` (1.6) e o aceite de convite do admin. Para elas
  a referência é o Design System, e a suíte de paridade não as cobre.
- **Telas de R2**: painel do artista, fila e avaliação do curador, pacotes do
  admin. O protótipo tem todas (`telaInicial` cobre Fila, Avaliação, Enviar,
  Carteira, Pacotes de Claves), e a suíte de paridade já tem o mecanismo — falta
  escrever os cenários.


---

## Divergências levantadas pela implementação do perfil do artista · 2026-09-14

### 1. Os catálogos de gênero do artista e do curador não são o mesmo

O protótipo do **artista** traz onze gêneros; o do **curador**, doze. A
diferença é uma entrada: **"Pagode"**, que existe só no lado do curador.

| | Catálogo |
|---|---|
| Artista (perfil 7.1 e passo 2 do envio) | MPB contemporânea · Rap nacional · Trap · Funk · Eletrônico · Rock alternativo · Indie · Samba · Sertanejo · Jazz · Experimental |
| Curador (passo 2 do cadastro) | os mesmos, **mais Pagode** |

Cada lado foi implementado com o catálogo do seu próprio protótipo —
`GENEROS_DO_ARTISTA` em [`src/textos/prototipo.ts`](../../src/textos/prototipo.ts)
e `CURADOR_CADASTRO.generos` em [`src/textos/curador.ts`](../../src/textos/curador.ts) —
porque a precedência do [AGENTS.md](../../AGENTS.md) manda seguir o protótipo, e
aqui os dois protótipos discordam entre si.

**Por que importa, e não é cosmético.** A R3 faz *matching* de gênero entre a
faixa enviada e o que o curador declara receber ([módulo 4](02-ambiente-artista.md#4-seleção-de-curadores)).
Com vocabulários diferentes, "Pagode" é um gênero que um curador pode declarar e
que **nenhuma faixa jamais terá** — o filtro devolve vazio para sempre, sem erro
nenhum que denuncie a causa.

**Pergunta ao cliente:** o catálogo é um só (e então "Pagode" entra no lado do
artista), ou são dois de propósito? Se for um só, o lugar dele deixa de ser
`textos/` e passa a ser tabela — do contrário a R3 vai precisar de uma terceira
cópia para o filtro.

**Custo de corrigir agora:** uma linha em `GENEROS_DO_ARTISTA`. Depois da R3,
é migração de dado.

### 2. Onde o perfil do artista foi além do protótipo

O protótipo não desenha teto de seleção nos chips de gênero — ele deixa marcar
quantos quiser. Mas `perfil_artista` tem
`check (coalesce(array_length(generos, 1), 0) <= 3)` desde a `0002`, e o próprio
rótulo da tela diz *"Gêneros · até 3"*.

Implementado com o teto na interface (`Chips` ganhou a prop `maximo`, que
desabilita os não marcados ao chegar no limite). É a mesma decisão já registrada
para a tela 21: o protótipo, sendo mock, deixa passar o que o banco recusaria —
e recusar antes é melhor que estourar `23514` depois do formulário preenchido.

### 3. O perfil do curador (17.1) ficou em leitura, e não editável

O PRD §17.1 descreve a tela com **foto, bio e gêneros editáveis** ("Ações:
upload/trocar foto · Salvar") e só as credenciais em leitura. Implementada
**inteira em leitura**, com um link para "Meu cadastro" (12.6).

A razão é que **12.6 já edita exatamente esses campos** — bio, gêneros, mídias e
serviços —, e foi entregue na R1. Dar um segundo formulário para o mesmo dado
repetiria, em bio e gêneros, o problema que a própria `TelaDeConta` evita para
senha e exclusão: dois caminhos para a mesma escrita, e a chance de corrigir um
e esquecer o outro.

A classe e as credenciais seguem em leitura nos dois lugares, o que não é
decisão de tela: o trigger `proibir_autopromocao_de_classe` da `0002c` recusa a
escrita do próprio curador, e o único caminho é a RPC
`concluir_cadastro_curador`.

**Pergunta ao cliente:** 17.1 pode continuar sendo a vitrine em leitura, com a
edição concentrada em "Meu cadastro"? Se a intenção era ter a edição nos dois
lugares, o custo é baixo — mas aí "Meu cadastro" e "Perfil" passam a ser a mesma
tela em dois endereços, e vale eliminar um dos dois.

### 4. Onde o perfil vive é diferente nos dois ambientes

No artista, "Perfil" é **rota própria** (`/artista/perfil`) com item na sidebar;
no curador, é **aba** de Conta (`/curador/conta?aba=perfil`).

Não é inconsistência nossa: é o que cada protótipo faz. O do artista tem
"Perfil" na sidebar e uma tela "Editar cadastro" separada; o do curador não tem
item de perfil na sidebar nenhum, e o PRD lista 17.1 como uma das quatro telas
de Conta. Pela precedência do [AGENTS.md](../../AGENTS.md), cada lado segue o seu.

Consequência prática registrada em código: `ehAbaDeConta` passou a receber o
ambiente. Sem isso, `/artista/conta?aba=perfil` passaria na validação e
renderizaria uma aba que aquele ambiente não tem — tela em branco, sem erro.

---

## Achado da suíte E2E · 2026-09-14

### `E2E_SENHA` duplicada no `.env.local` derrubava a suíte inteira

Nenhum dos 16 cenários passava nesta máquina — nem os três que o backlog dava
como verdes (A1–A3). Todos falhavam no **login**, com "E-mail ou senha
inválidos", e o sintoma apontava para uma causa errada: senha trocada no banco.

A causa era outra. `.env.local` tinha **duas** linhas `E2E_SENHA=`, com valores
diferentes — uma senha gerada e um `Dissona2026` acrescentado depois. E
[`e2e/setup/ambiente.ts`](../../e2e/setup/ambiente.ts) nunca sobrescreve o que
já está definido:

```ts
if (process.env[chave] !== undefined) continue;
```

A regra existe por um bom motivo — no CI a variável vem do secret do job, e um
`.env.local` esquecido na máquina não deve vencer dele. O efeito colateral é que
**a primeira ocorrência do arquivo ganha**, e a segunda é silenciosamente
ignorada. O banco tinha o hash da segunda; o Playwright mandava a primeira.

Resolvido mantendo a senha forte, removendo a duplicata e rotacionando as oito
contas `e2e_` para ela. Depois disso: 78 testes passando, 11 em `skip`.

**Vale como lição de diagnóstico:** o carregador de `.env` do projeto é
deliberadamente "primeiro vence", e isso torna chave repetida um erro mudo. Se
a suíte voltar a falhar em massa no login, conferir duplicata antes de suspeitar
do banco:

```bash
grep -c '^E2E_SENHA=' .env.local   # tem de devolver 1
```

---

## Achados da implementação do envio · 2026-09-14

### 1. O artista não conseguia ver o nome de curador nenhum

A policy de `perfil_curador` libera os aprovados para qualquer autenticado. Mas
o **nome** não mora ali — mora em `perfil`, cuja policy é:

```sql
using (id = auth.uid() or e_admin())
```

O efeito: um embed `perfil_curador!inner(perfil!inner(nome_completo))` devolve
**zero linha** para o artista, sem erro nenhum. A tela cai no estado vazio como
se não houvesse curador disponível — e a mesma coisa acontecia na tela de status
do envio, que parecia dizer que a faixa não tinha sido enviada a ninguém.

Isso bloquearia igualmente a **Seleção de Curadores (módulo 4)** da R3, que é a
tela de verdade.

Resolvido pela migration **`0002f`**, que cria a view `curador_publico` com
exatamente quatro colunas — `perfil_curador_id`, `classe`, `situacao`, `nome` —
restrita aos aprovados e ativos.

**Por que view e não policy:** RLS filtra linha, não coluna. Uma policy de
`select` em `perfil` liberaria junto `handle`, `cidade`, `idioma`, `situacao`,
`aceite_termos_em` e `desativada_em`. A view expõe só o necessário.

⚠️ É o **oposto** da decisão de `saldo_carteira`, que é `security_invoker = true`
para herdar a RLS. A diferença é o propósito: lá, recorte privado de dado
financeiro; aqui, vitrine deliberadamente pública. Está escrito no cabeçalho da
migration para quem for mexer.

### 2. `pnpm db:tipos` destruía o arquivo quando falhava

O script era `supabase gen types … > src/lib/supabase/tipos-bd.ts`. O `>` do
shell **trunca antes de o comando rodar** — e a CLI falha sem
`SUPABASE_ACCESS_TOKEN`, que não é versionável. O resultado era `tipos-bd.ts`
com uma linha de JSON de erro, e o typecheck quebrando em centenas de lugares
sem que nenhuma mensagem citasse o token.

Aconteceu de fato nesta sessão; o arquivo foi recuperado do git.

Substituído por [`scripts/gerar-tipos-bd.mjs`](../../scripts/gerar-tipos-bd.mjs),
que captura a saída, confere que ela contém `export type Database` e só então
escreve. Falhou, o arquivo anterior fica intacto e a mensagem diz o que fazer.

> **Pendência:** `curador_publico` ainda não está em `tipos-bd.ts`, porque
> regenerá-lo exige o token. Enquanto isso, `modulos/selecao/repositorio.ts`
> declara a linha à mão, num ponto só e com o cast anotado. Rodar
> `pnpm db:tipos` com um token remove os dois.

### 3. Componentes com input visualmente escondido e o Playwright

`Chips` e `Checkbox` escondem o `<input>` com `clip-path`/posicionamento e
deixam o `<label>` receber o clique — que é o padrão acessível correto. Mas
`locator.check()` do Playwright tenta clicar no **input**, e o label intercepta.

Nos cenários, a forma que funciona é a que uma pessoa usa: clicar no rótulo
(`getByText(...).click()`), ou `check({ force: true })` quando o rótulo não é
único. Vale lembrar ao escrever C3–C5, que usam os mesmos componentes.

---

## Divergências levantadas pela implementação da avaliação · 2026-09-14

Módulo 14 e suas quatro subtelas. Três divergências com o protótipo, dois
defeitos encontrados no que já existia, e uma limitação da suíte.

### 1. A escolha de compartilhamento é **exclusiva**, e no protótipo é múltipla

O protótipo de 14.2 deixa marcar playlist **e** post **e** matéria ao mesmo
tempo (`avShare` é um mapa de booleanos). O banco guarda **uma** escolha por
avaliação: `compartilhamento.avaliacao_id` é `unique` e `modalidade` é uma
coluna só.

E o acréscimo é o mesmo 8% em qualquer caso — `calcular_remuneracao` lê
`compartilhou` como booleano. Então a multiescolha do protótipo não muda nem a
remuneração nem o registro: ela só prometeria gravar três coisas e gravaria uma.

Implementado como `<input type="radio">`, com "Não vou compartilhar desta vez"
fora da grade dos quatro, como no protótipo. **Se o cliente quiser a
multiescolha de verdade**, é mudança de schema — `compartilhamento` passaria a
ter uma linha por modalidade —, e não de tela.

### 2. "Curadora Prata" virou "Sua classe" + selo

O cabeçalho de 14.4 no protótipo diz "Curadora {classe}", no feminino, porque a
persona dele é a Marina. Flexionar o cabeçalho pelo gênero de quem está logado é
informação que a aplicação não tem — e não deveria pedir para exibir um selo.

A classe aparece pelo `<SeloClasse>`, sob o rótulo neutro "Sua classe".

### 3. Uma justificativa por critério, e não um `<textarea>` que troca de assunto

Em 14 o protótipo tem **um** campo de justificativa, e clicar num critério troca
o que ele edita. Aqui cada critério traz o seu, empilhado sob a nota.

O motivo não é preferência: com um campo só, preencher onze justificativas exige
JavaScript funcionando e um `<textarea>` cujo rótulo muda de significado
conforme o estado — que o leitor de tela anuncia sempre igual. Com um por
critério, o formulário inteiro viaja num `POST` e cada campo tem nome próprio.

### 4. 🐞 `proibir_alteracao_de_ganho` cancela **todo** `delete`, inclusive o do superusuário

A função da `0009` faz `if current_user <> 'authenticated' then return new; end
if;`. Num trigger `before delete` por linha, `NEW` é `NULL` — e retornar `NULL`
num `before` **cancela a operação**. Resultado: `delete from ganho_curador`
apaga zero linhas e **não levanta erro nenhum**, para qualquer papel.

Comprovado nesta sessão com uma tabela temporária que usa a mesma função: uma
linha inserida, um `delete`, `row_count = 0`, linha intacta.

Para `authenticated` o efeito pretendido continua valendo (o `raise` da linha
seguinte nunca é alcançado, mas o `delete` também não passa). O que não vale é
a intenção do `if`: ele queria deixar as RPCs e os jobs passarem. Hoje ninguém
passa — nem uma correção de payout, nem um expurgo de LGPD.

Correção sugerida, para uma migration própria: `return old` no ramo de `delete`
(ou `coalesce(new, old)`), e uma asserção na suíte da `0009` provando que o
`delete` de fato apaga quando o papel é privilegiado.

**Não corrigido aqui**: é DDL, e a avaliação não depende disso.

### 5. 🐞 `perfil_curador` é legível por qualquer autenticado, e `maybeSingle()` sem filtro falhava

A policy de leitura é `situacao in ('bronze_aprovado','prata_aprovado') or
perfil_id = auth.uid() or e_admin()` — todo curador aprovado é público para
autenticados, porque a seleção de curadores (4) precisa listá-los.

`garantirRascunho` fazia `from('perfil_curador').select('id').maybeSingle()` sem
filtro, contando com a RLS para sobrar uma linha só. Com mais de um curador
aprovado no banco, a consulta passa a devolver várias e o `maybeSingle()` falha
— e falha parecendo "você não é curador", que é o diagnóstico errado.

Corrigido em `modulos/avaliacao/repositorio.ts`: a leitura filtra por
`perfil_id = auth.uid()`. **Vale a varredura**: qualquer outro `maybeSingle()`
sobre `perfil_curador` tem o mesmo defeito latente.

### 6. `iniciarAvaliacao` recusava um envio já `avaliando`

O `update` aceitava só `recebeu` e `ouviu`. Mas "Iniciar avaliação" também é a
porta da **retomada** — quem usou "Salvar e sair" volta pela fila e clica no
mesmo botão —, e a segunda entrada afetava zero linhas, com a tela dizendo que a
faixa não estava mais disponível.

`avaliando` entrou na lista, e `iniciou_em` só é gravado na primeira vez.

### 7. A suíte E2E consome um envio por execução, e o seed o repõe

C6 conclui uma avaliação, e concluir é irreversível: o envio vira `pronto` e
`ganho_curador` não se apaga (ver a divergência 4 — hoje nem por superusuário).
Então o cenário usa uma faixa própria, `e2e_Faixa para concluir`, e
[`dados-e2e.sql`](../../supabase/testes/dados-e2e.sql) cria outra sempre que não
houver nenhuma pendente.

**Consequência operacional:** o seed tem de rodar **antes de cada execução** da
suíte, e não uma vez só. Sem isso, o último teste de C6 falha com a mensagem
"a fila precisa listar ... — rode supabase/testes/dados-e2e.sql". Os outros 31
cenários do curador são idempotentes.

O CI ainda não roda o seed — ver o job `e2e` de [`ci.yml`](../../.github/workflows/ci.yml).
Automatizá-lo depende de credencial de banco no job, que é a mesma pendência de
`SUPABASE_SERVICE_ROLE_KEY`.
