# Requisitos — Dissona

Requisitos funcionais (RF) e não funcionais (RNF) da plataforma. Cada RF traz critérios de aceite em Dado/Quando/Então e rastreabilidade para o módulo do PRD.

← [PRD](PRD.md) · [Regras de negócio](prd/01-regras-de-negocio.md) · [Modelo de dados](data-model.md) · [Backlog](BACKLOG.md)

**Base:** 1 Clave = R$ 10,00 · margem da plataforma 50% · prazo de repasse cheio 72h · devolução automática em 7 dias.

> Os RF de **R1 e R2** estão detalhados; os de **R3 a R5** estão em nível de módulo, porque não há protótipo e o board é a única fonte. Itens marcados ⚠️ dependem de decisão registrada em [open-questions](open-questions.md).

---

## Índice

| Faixa | Módulo | Release |
|---|---|---|
| [RF-001 a RF-010](#1-autenticação--módulos-1--11) | Autenticação (artista e curador) | R1 |
| [RF-011 a RF-018](#2-cadastro-do-curador--módulo-12) | Cadastro do curador | R1 |
| [RF-019 a RF-027](#3-conta-e-configurações--módulos-7-e-17) | Conta e configurações | R1 |
| [RF-028 a RF-034](#4-autenticação-e-equipe-do-admin--módulos-19-e-27) | Autenticação e equipe do admin | R1 |
| [RF-035 a RF-041](#5-envio-de-música--módulo-3) | Envio de música | R2 |
| [RF-042 a RF-049](#6-carteira-e-claves--módulo-5) | Carteira e Claves | R2 |
| [RF-050 a RF-053](#7-pacotes-de-claves--módulo-21) | Pacotes de Claves (admin) | R2 |
| [RF-054 a RF-057](#8-fila-de-avaliações--módulo-13) | Fila de avaliações | R2 |
| [RF-058 a RF-068](#9-avaliação--módulo-14) | Avaliação | R2 |
| [RF-069 a RF-071](#10-sla-e-devolução-automática) | SLA e devolução automática | R2 |
| [RF-072 a RF-084](#11-requisitos-de-r3-a-r5) | R3 a R5 | R3–R5 |
| [RNF-001 a RNF-016](#requisitos-não-funcionais) | Não funcionais | — |

---

# Requisitos funcionais

## 1. Autenticação — módulos 1 / 11

**Release 1.** Tela única para artista e curador; o papel é escolhido dentro do fluxo.

### RF-001 · Login com e-mail e senha

**Descrição:** autenticar o usuário e roteá-lo ao ambiente correspondente ao seu papel.

- **Dado** que sou usuário cadastrado, **quando** informo e-mail e senha válidos, **então** sou autenticado e vou ao ambiente do meu papel.
- **Dado** que informo credenciais inválidas, **quando** tento entrar, **então** vejo *"e-mail ou senha inválidos"*, sem revelar qual campo falhou.
- **Dado** que minha conta está bloqueada, **quando** tento entrar, **então** vejo a mensagem de conta bloqueada com contato de suporte.
- **Dado** que ainda não escolhi papel, **quando** o login conclui, **então** sou levado à Seleção de perfil (RF-006).

**Rastreabilidade:** [02 · módulo 1](prd/02-ambiente-artista.md#1-autenticação)

### RF-002 · Login social

**Descrição:** autenticar via OAuth com Google, Facebook e SoundCloud.

- **Dado** que escolho Google ou Facebook, **quando** autorizo no provedor, **então** sou autenticado e nome e e-mail vêm pré-preenchidos.
- **Dado** que escolho SoundCloud, **quando** autorizo, **então** sou autenticado — e **só o nome** vem do provedor: a API dele não expõe e-mail, então o endereço é colhido na tela de confirmação do cadastro.
- **Dado** que informei o endereço, **quando** concluo a confirmação, **então** recebo o link de verificação e sou levado à tela que o explica — e a conta **navega** enquanto ele não for confirmado, com a pendência marcada no menu da conta.
- **Dado** que o endereço informado já pertence a outra conta, **quando** confirmo, **então** vejo o banner de e-mail em uso com o caminho para entrar pelo provedor de origem, e o aceite **não** é consumido.
- **Dado** que o e-mail do provedor já existe na base, **quando** autorizo, **então** as contas são vinculadas em vez de duplicadas.
- **Dado** que conectei minha conta do SoundCloud, **quando** quero desconectá-la, **então** encontro a ação em Conta e configurações, e os dados pessoais vindos do provedor são expurgados em até **7 dias** — exigência do ToS da API deles.

⚠️ SoundCloud não é provider nativo do Supabase Auth: entra como **custom OAuth provider** (OAuth 2.1 + PKCE, `email_optional`), e depende de assinatura **Artist Pro** na conta da plataforma ([#9](open-questions.md#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail)).

**Rastreabilidade:** [02 · módulo 1](prd/02-ambiente-artista.md#1-autenticação) · [01 §9.1](prd/01-regras-de-negocio.md#91-login-e-papéis)

### RF-003 · Cadastro de conta

Vale para `/cadastrar` e `/artista/cadastrar`. **Não** vale para
`/curador/cadastrar` — ver a exceção abaixo.

- **Dado** que preencho nome, e-mail, senha e confirmação **e** aceito Termos + Política de privacidade, **quando** confirmo, **então** a conta é criada e recebo e-mail de verificação.
- **Dado** que não marco o aceite, **quando** tento criar, **então** sou barrado com alerta de campo obrigatório.
- **Dado** que o e-mail já existe, **quando** tento criar, **então** vejo o erro com link para a tela de login.
- **Dado** que digito a senha, **quando** ela tem menos de 8 caracteres ou nenhum número, **então** o indicador de força barra o envio.

**Exceção — `/curador/cadastrar`:** o protótipo (`docs/R2/extraido/Curador.html`)
não tem "Confirmar senha" nem o checkbox de aceite no passo 1 do wizard —
Nome completo, E-mail e Senha, só. Decisão do cliente em 2026-09-22 de seguir
o protótipo aqui: os dois critérios de confirmação e aceite não se aplicam a
esta rota. Os outros dois (e-mail já existe, senha fraca barrada) continuam
valendo — ver `esquemaCadastroCurador` em `modulos/autenticacao/esquemas.ts` e
`docs/prd/07-pendencias-e-divergencias.md`.

**Rastreabilidade:** [02 · 1.1](prd/02-ambiente-artista.md#11--cadastro)

### RF-004 · Verificação de e-mail

- **Dado** que criei conta, **quando** abro o link recebido dentro de **24 horas**, **então** o e-mail é confirmado e sigo para a Seleção de perfil.
- **Dado** que o link expirou, **quando** o abro, **então** posso reenviar ou corrigir o endereço.

**Rastreabilidade:** [02 · Verificação de e-mail](prd/02-ambiente-artista.md#verificação-de-e-mail-protótipo)

### RF-005 · Recuperação e redefinição de senha

- **Dado** que informo um e-mail na recuperação, **quando** envio, **então** recebo sempre a resposta neutra *"se este e-mail estiver cadastrado, enviamos um link"*.
- **Dado** que abro o link válido, **quando** informo nova senha e confirmação dentro de **60 minutos**, **então** a senha é atualizada e volto ao login.
- **Dado** que o token expirou **ou** já foi usado, **quando** tento redefinir, **então** vejo o erro e posso reiniciar o fluxo.
- **Dado** que redefini a senha, **quando** a operação conclui, **então** as **demais sessões da conta são encerradas**.

**Rastreabilidade:** [02 · 1.2 e 1.3](prd/02-ambiente-artista.md#12--recuperação-de-senha)

### RF-006 · Seleção de perfil no primeiro acesso

- **Dado** que é meu primeiro acesso, **quando** a autenticação conclui, **então** vejo "Sou artista" e "Sou curador", com a nota de que o outro papel pode ser ativado depois.
- **Dado** que escolho artista, **quando** confirmo, **então** vejo o onboarding do artista e chego ao Dashboard.
- **Dado** que escolho curador, **quando** confirmo, **então** sou levado ao **Cadastro de curador (módulo 12)** e só depois ao onboarding do curador.

**Rastreabilidade:** [02 · 1.4](prd/02-ambiente-artista.md#14--seleção-de-perfil)

### RF-007 · Onboarding por ambiente

- **Dado** que é meu primeiro acesso ao ambiente, **quando** entro, **então** vejo um tour de **4 passos** com "Passo X de 4", Avançar, Voltar e Pular.
- **Dado** que pulo ou finalizo, **quando** a ação conclui, **então** entro no ambiente e o tour não reaparece.
- **Dado** que quero rever, **quando** aciono "Rever onboarding" no menu de ajuda, **então** o tour reabre.

Conteúdo — **artista:** enviar música · receber leitura real · acompanhar evolução · circular mais longe. **Curador:** fila · avaliação · remuneração · classes. **Admin:** versão enxuta.

**Rastreabilidade:** [02 · 1.5](prd/02-ambiente-artista.md#15--onboarding)

### RF-008 · Papéis acumuláveis

- **Dado** que sou artista, **quando** ativo o papel de curador em Conta, **então** mantenho os dois papéis e posso alternar pelo header.
- **Dado** que tenho dois papéis, **quando** faço login, **então** entro no último ambiente usado.

⚠️ O protótipo diz que ativar o papel de curador *"depende de aprovação da curadoria"* — fluxo não descrito no board.

**Rastreabilidade:** [01 §9.1](prd/01-regras-de-negocio.md#91-login-e-papéis) · [02 · 7.2](prd/02-ambiente-artista.md#72--dados-da-conta)

### RF-009 · Notificação de novo cadastro ao admin

- **Dado** que um usuário conclui o cadastro, **quando** a conta é criada, **então** um evento in-app é gravado para o admin, apontando para Gestão (20).

**Rastreabilidade:** [06 — Matriz](prd/06-matriz-notificacoes.md)

### RF-010 · Termos de uso e Política de privacidade

- **Dado** que estou em qualquer tela de aceite, **quando** clico nos links, **então** abro as páginas públicas de Termos e de Política de privacidade.

---

## 2. Cadastro do curador — módulo 12

**Release 1.** Wizard de **8 passos** com indicador de progresso e retomada.

### RF-011 · Identificação

- **Dado** que já estou logado, **quando** entro no cadastro, **então** nome e e-mail vêm da conta e a senha permanece a mesma.

### RF-012 · Modalidades de compartilhamento

- **Dado** que adiciono uma mídia, **quando** informo tipo (playlist, YouTube, Instagram, site, blog, rádio, podcast), nome e link, **então** o link é **validado antes de salvar**.
- **Dado** que cadastro uma playlist do Spotify, **quando** salvo, **então** o sistema tenta detectar o número de salvamentos. ⚠️ Depende da integração; sem ela o dado não existe.

### RF-013 · Serviços e preços

- **Dado** que estou no passo de serviços, **quando** defino preços em Claves, **então** **Feedback** é obrigatório e Playlist, Post e Matéria são opcionais.
- **Dado** que informo um preço, **quando** salvo, **então** ele é aceito somente se maior que zero.

### RF-014 · Perfil profissional e credenciais

- **Dado** que preencho atuação, tempo, especialidade, formação, prêmios, veículos e participação em disco, **quando** salvo, **então** cada credencial com link é registrada como verificável.

### RF-015 · Classificação automática

- **Dado** que declarei **menos de 2** credenciais verificáveis com link, **quando** o wizard conclui, **então** sou classificado **Bronze**.
- **Dado** que declarei **2 ou mais**, **quando** o wizard conclui, **então** viro **candidato a Prata** com situação "em análise".
- **Dado** que estou na tela de classificação, **quando** ela carrega, **então** vejo as credenciais reconhecidas, a contagem e a nota de que **Ouro não é atribuído no cadastro**.

⚠️ Os critérios definitivos de classe são pendência do cliente; os thresholds vêm de `configuracao`.

### RF-016 · Tela final Bronze

- **Dado** que fui classificado Bronze, **quando** concluo, **então** tenho acesso liberado na hora, recebo boas-vindas e a oferta do curso de curadoria (opcional).

### RF-017 · Tela final Prata

- **Dado** que sou candidato a Prata, **quando** concluo, **então** vejo "Cadastro em análise", o admin é notificado (20.3) e meu acesso à curadoria fica retido até a decisão.

### RF-018 · Alteração de cadastro e mídias (12.6)

- **Dado** que sou curador cadastrado, **quando** insiro, edito ou excluo mídias e edito serviços e preços, **então** as alterações valem para novas contratações e **não alteram minha classe**.
- **Dado** que excluo uma mídia, **quando** confirmo, **então** a exclusão é registrada e contratações já feitas seguem válidas.

**Rastreabilidade (RF-011 a RF-018):** [03 · módulo 12](prd/03-ambiente-curador.md#12-perfil--cadastro-de-curador)

---

## 3. Conta e configurações — módulos 7 e 17

**Release 1.**

### RF-019 · Perfil do artista

- **Dado** que edito o perfil, **quando** preencho foto, nome artístico, cidade, handle, bio (**≤280** com contador), gêneros (**até 3**) e links, **então** cada link é validado e as alterações são salvas.

### RF-020 · Dados da conta do artista

- **Dado** que altero o e-mail, **quando** informo a senha atual, **então** o novo endereço só passa a valer **após confirmação enviada para ele**.
- **Dado** que gerencio cobrança, **quando** salvo nome e CPF, **então** os dados ficam disponíveis para a emissão de nota fiscal na compra de Claves.

### RF-021 · Ativação do papel de curador

- **Dado** que sou artista, **quando** aciono "Ativar papel de curador", **então** o papel é acrescido e sou levado ao Cadastro de curador (12). ⚠️ Pendente se há aprovação adicional.

### RF-022 · Preferências

- **Dado** que altero toggles de notificação ou o idioma (pt-BR, es, en), **quando** mudo o valor, **então** ele é salvo automaticamente.
- **Dado** que um evento é **crítico**, **quando** abro as preferências, **então** ele aparece sem opção de desativar.

### RF-023 · Segurança — senha e sessões

- **Dado** que altero a senha, **quando** informo a senha atual, **então** as **outras sessões são encerradas** e recebo aviso por e-mail.
- **Dado** que abro Sessões ativas, **quando** a lista carrega, **então** vejo navegador, cidade e último acesso, e posso encerrar qualquer sessão que não seja a atual.

### RF-024 · Exclusão de conta (LGPD)

- **Dado** que inicio a exclusão, **quando** avanço o passo 1, **então** posso baixar um `.zip` com perfil, faixas enviadas, devolutivas recebidas e histórico de Claves.
- **Dado** que estou no passo 2, **quando** informo a senha atual **e** digito `EXCLUIR`, **então** a conta é desativada na hora, apagada em **30 dias** e reversível nesse prazo.
- **Dado** que a conta foi excluída, **quando** o prazo vence, **então** as devolutivas já pagas **permanecem** com os curadores.

### RF-025 · Perfil do curador

- **Dado** que edito o perfil, **quando** altero foto, bio e gêneros, **então** as credenciais e a classe aparecem **somente em leitura**.

### RF-026 · Dados de recebimento do curador

- **Dado** que cadastro a chave Pix com CPF, **quando** salvo, **então** os dados são validados e a chave exibe o status de verificação.
- **Dado** que os dados bancários não estão validados, **quando** tento sacar, **então** o saque fica indisponível.

### RF-027 · Preferências e segurança do curador

Idênticos a RF-022, RF-023 e RF-024, com o catálogo de eventos do curador.

**Rastreabilidade (RF-019 a RF-027):** [02 · módulo 7](prd/02-ambiente-artista.md#7-conta-e-configurações) · [03 · módulo 17](prd/03-ambiente-curador.md#17-conta-e-configurações)

---

## 4. Autenticação e equipe do admin — módulos 19 e 27

**Release 1.**

### RF-028 · Login admin restrito

- **Dado** que sou membro da equipe, **quando** informo e-mail corporativo e senha, **então** entro no painel administrativo.
- **Dado** que não tenho papel admin, **quando** tento entrar, **então** recebo **acesso negado**.
- **Dado** que estou na tela de login admin, **quando** ela carrega, **então** **não há** autocadastro nem login social, e o rodapé informa que contas são criadas por convite.

### RF-029 · Recuperação de senha admin

- **Dado** que solicito o link, **quando** envio, **então** recebo resposta neutra e o reenvio respeita um **cooldown**.
- **Dado** que redefino a senha, **quando** confirmo, **então** as outras sessões da conta são encerradas.

### RF-030 · Dados pessoais do membro

- **Dado** que edito meus dados, **quando** altero foto, nome, cargo ou e-mail corporativo, **então** a troca de e-mail ou senha **exige a senha atual** e mostra a data da última alteração.

### RF-031 · Listagem da equipe

- **Dado** que abro Equipe, **quando** a tabela carrega, **então** vejo membro, e-mail, papel, status e ações, com a própria linha marcada como "Você".
- **Dado** que um convite está pendente, **quando** abro as ações, **então** posso reenviá-lo.

### RF-032 · Convite de membro

- **Dado** que informo e-mail corporativo e papel, **quando** envio, **então** o convidado recebe e-mail e o acesso passa a valer **quando ele aceita**.

### RF-033 · Aceite de convite

- **Dado** que abro o convite válido, **quando** defino a senha, **então** minha conta admin é criada com o papel do convite.
- **Dado** que o convite expirou ou já foi aceito, **quando** o abro, **então** vejo o erro e a orientação de pedir novo convite.

### RF-034 · Papéis e permissões

- **Dado** que abro Papéis e permissões, **quando** a tela carrega, **então** vejo **Administrador · Moderador · Financeiro · Suporte** com toggles de acesso por módulo.
- **Dado** que sou Administrador, **quando** altero permissões, **então** mantenho acesso total, inclusive a equipe e papéis, e a alteração é registrada.

⚠️ A matriz de permissões por módulo é pendência do cliente — a tela existe, o conteúdo depende da definição.

**Rastreabilidade (RF-028 a RF-034):** [04 · módulos 19 e 27](prd/04-ambiente-admin.md#19-autenticação-admin)

---

## 5. Envio de música — módulo 3

**Release 2.** Wizard de 3 passos.

### RF-035 · Envio por link com autodetecção

- **Dado** que colo um link de Spotify ou YouTube, **quando** aciono "Detectar faixa", **então** vejo o estado *"Procurando os dados da faixa"*.
- **Dado** que a detecção funciona, **quando** ela retorna, **então** vejo "Faixa encontrada" com capa, título e informações, e a opção "Corrigir dados".
- **Dado** que a detecção falha, **quando** ela retorna, **então** sou levado ao preenchimento manual (RF-037).

### RF-036 · Envio por arquivo

- **Dado** que envio um arquivo, **quando** ele é **MP3 ou WAV de até 50 MB**, **então** o upload é aceito e sigo para os detalhes.
- **Dado** que o arquivo excede 50 MB ou tem formato inválido, **quando** tento enviar, **então** sou barrado com mensagem específica, **validada também no servidor**.

⚠️ Armazenar o arquivo sempre, ou só quando a faixa não está no streaming, é pendência do cliente.

### RF-037 · Detalhes manuais

- **Dado** que a autodetecção falhou ou enviei arquivo, **quando** preencho capa, título, estilo predominante, "a faixa já foi lançada?" com data e links de streaming, **então** os dados são gravados.

### RF-038 · Contexto para o curador

- **Dado** que estou no passo 2, **quando** informo o gênero e respondo **"O que o curador precisa saber?"** (campo com contador), **então** posso avançar. O campo é **obrigatório**.

### RF-039 · Revisão

- **Dado** que estou no passo 3, **quando** a tela carrega, **então** vejo faixa, fonte (arquivo ou link), gênero e contexto, com "Voltar" e "Enviar para curadoria", além do aviso de que as Claves só saem na confirmação da seleção.

### RF-040 · Confirmação do envio

- **Dado** que confirmo o envio, **quando** ele é gravado, **então** vejo *"Seu envio chegou"* com as ações Acompanhar status, Voltar ao início e Enviar outra faixa.

> O protótipo diz "Sua submissão chegou", mas a terminologia decidida é **"Envios"**, nunca "Submissões" ([PRD §9](PRD.md), [arquitetura §8](architecture.md)). É a única divergência em que o protótipo **não** vence, e o próprio [Guia de Testes](R2/guia-de-testes-r2.md) já registra a correção.

### RF-041 · Placeholder de seleção de curadores (R2)

- **Dado** que a tela real de Seleção (módulo 4) é da R3, **quando** confirmo o envio na R2, **então** um caminho provisório cria os `envio` para curadores, para que a fila e a avaliação sejam testáveis fim a fim.

**Rastreabilidade (RF-035 a RF-041):** [02 · módulo 3](prd/02-ambiente-artista.md#3-minhas-músicas--enviar) · Guia de Testes R2

---

## 6. Carteira e Claves — módulo 5

**Release 2.**

### RF-042 · Saldo da carteira

- **Dado** que abro a Carteira, **quando** ela carrega, **então** vejo **saldo disponível** (em Claves e em reais), **comprometidas em análise** e **devolvidas por falta de resposta**.
- **Dado** que tenho movimentações, **quando** a tela carrega, **então** vejo as últimas movimentações e os atalhos "Comprar Claves" e "Ver extrato".
- **Dado** que sou artista novo, **quando** abro a Carteira, **então** vejo o estado vazio com CTA de compra.

### RF-043 · Lista de pacotes

- **Dado** que abro Pacotes, **quando** a lista carrega, **então** vejo **apenas pacotes ativos**, cada um com quantidade, preço, **preço por Clave** e selo quando houver.

⚠️ A tabela de pacotes (quantidades, preços e descontos) é pendência do cliente.

### RF-044 · Checkout com Pix

- **Dado** que escolho Pix, **quando** confirmo, **então** recebo **QR Code e código copia e cola**, e o resumo mostra quantidade, valor bruto, desconto, total e preço por Clave.

### RF-045 · Checkout com cartão

- **Dado** que escolho cartão, **quando** informo número, nome impresso, validade e código, **então** os dados são **tokenizados** e a cobrança é criada no gateway. Dados de cartão **não são persistidos** pela plataforma.

### RF-046 · Estados do pagamento

- **Dado** que a cobrança foi criada, **quando** aguardo, **então** vejo o estado **processando**.
- **Dado** que o pagamento é aprovado, **quando** o gateway confirma, **então** vejo *"o saldo entra na carteira assim que o banco confirma"*, com "Ir para a carteira" e "Ver no extrato".
- **Dado** que o pagamento é recusado, **quando** o gateway responde, **então** vejo *"O banco não autorizou a cobrança. Nada foi debitado e o saldo continua o mesmo."* com "Tentar de novo".

### RF-047 · Crédito do saldo por webhook

- **Dado** que o gateway confirma o pagamento, **quando** o webhook chega, **então** o crédito é lançado **uma única vez**, ainda que o mesmo evento seja reenviado.

### RF-048 · Extrato

- **Dado** que abro o extrato, **quando** ele carrega, **então** vejo Data, Origem, Tipo, Claves e Saldo, com filtro por tipo de movimentação.
- **Dado** que o filtro não retorna nada, **quando** aplico, **então** vejo *"Nada nesse filtro — troque o tipo de movimentação para ver o restante."*
- **Dado** que houve devolução por falta de resposta, **quando** abro o extrato, **então** ela aparece explicitamente como **devolvida**.

### RF-049 · Bloqueio por saldo insuficiente

- **Dado** que meu saldo não cobre a seleção, **quando** tento confirmar, **então** sou barrado e levado a comprar Claves, com alerta de saldo baixo.

**Rastreabilidade (RF-042 a RF-049):** [02 · módulo 5](prd/02-ambiente-artista.md#5-carteira-e-claves) · Guia de Testes R2

---

## 7. Pacotes de Claves — módulo 21

**Release 2.**

### RF-050 · Lista de pacotes (admin)

- **Dado** que abro a lista, **quando** ela carrega, **então** vejo Nome, Claves, Valor, Desconto, **Por Clave**, **Status** e ações Editar / Ativar-Desativar / Excluir.

### RF-051 · Criar e editar pacote

- **Dado** que informo o **desconto (%)**, **quando** saio do campo, **então** o **valor é recalculado**.
- **Dado** que informo o **valor (R$)**, **quando** saio do campo, **então** o **desconto é recalculado**.
- **Dado** que salvo, **quando** o pacote está ativo, **então** ele aparece na Carteira do artista imediatamente, e a alteração vale para **novas compras** e fica em log.
- **Dado** que informo valores ou percentuais inválidos, **quando** tento salvar, **então** sou barrado pela validação.

### RF-052 · Ativar e desativar

- **Dado** que desativo um pacote, **quando** confirmo, **então** ele sai da Carteira do artista sem afetar compras já feitas.

### RF-053 · Excluir pacote

- **Dado** que excluo um pacote, **quando** confirmo no modal, **então** ele sai da Carteira na hora, compras já feitas continuam válidas e a exclusão é registrada em log.

**Rastreabilidade (RF-050 a RF-053):** [04 · módulo 21](prd/04-ambiente-admin.md#21-gestão-de-pacotes-de-claves) · Guia de Testes R2

---

## 8. Fila de avaliações — módulo 13

**Release 2.**

### RF-054 · Fila do curador

- **Dado** que abro a fila, **quando** ela carrega, **então** vejo Música (capa, artista, título), Gênero, Serviço, **Prazo restante (72h)** e Status, ordenados por **urgência** por padrão.
- **Dado** que clico num cabeçalho ordenável (Música, Prazo, Status), **quando** a ordenação muda, **então** o estado é refletido em `aria-sort`.

### RF-055 · Filtros da fila

- **Dado** que filtro por status ou gênero, **quando** aplico, **então** a lista é filtrada; sem resultado, vejo *"Nada nesse recorte — troque o status ou o gênero para ver outras faixas."*

### RF-056 · Detalhe do item

- **Dado** que abro um item, **quando** a tela carrega, **então** vejo capa, gênero, título, artista, duração, data de envio, status, **"O que o artista quer saber"**, prazo restante, **serviços contratados** com valor em Claves e o total da leitura.

### RF-057 · Iniciar avaliação

- **Dado** que estou no detalhe, **quando** aciono "Iniciar avaliação", **então** entro no fluxo do módulo 14 e o envio passa a "avaliando".

**Rastreabilidade (RF-054 a RF-057):** [03 · módulo 13](prd/03-ambiente-curador.md#13-avaliações--fila--pendentes) · Guia de Testes R2

---

## 9. Avaliação — módulo 14

**Release 2.** Wizard de 5 etapas com "Salvar e sair" em todas.

### RF-058 · Player com escuta medida

- **Dado** que abro a avaliação, **quando** dou play, **então** o player mede e exibe o progresso da escuta e a duração da faixa.
- **Dado** que a escuta está **abaixo do mínimo**, **quando** tento concluir, **então** o envio é bloqueado com a explicação do gate.

⚠️ **Bloqueio:** o mínimo é 60% (protótipo do curador) ou 100% (protótipo do artista)? Sem a decisão, o valor não pode ser fixado — ele vem de `configuracao.escuta_minima_percentual`.

### RF-059 · Notas objetivas

- **Dado** que avalio, **quando** informo notas, **então** cada uma aceita **0 a 5 com uma casa decimal**, distribuídas nos 5 grupos: execução técnica (afinação, ritmo), composição (melodia, letra), identidade (personalidade, expressividade, originalidade), impacto (conexão, memorabilidade) e produção.
- **Dado** que preenchi apenas os obrigatórios, **quando** avanço, **então** consigo prosseguir; preencher **os onze** rende acréscimo.

⚠️ Só **10 dos 11** critérios estão nomeados no discovery — falta o item do grupo Produção. E quais 5 são obrigatórios não está definido.

### RF-060 · Justificativa por item

- **Dado** que escrevo a justificativa de um item, **quando** digito, **então** vejo o contador de **250 caracteres**; atingindo o mínimo, o item rende **+3%**.

### RF-061 · Resumo das notas objetivas

- **Dado** que preenchi notas, **quando** vejo o resumo, **então** ele mostra a média e a quantidade de critérios preenchidos, agrupados por bloco.

### RF-062 · Nota subjetiva

- **Dado** que estou na etapa 2, **quando** movo o slider, **então** registro a nota subjetiva de **0,0 a 5,0** com uma casa decimal.

### RF-063 · Feedback escrito

- **Dado** que escrevo o feedback, **quando** digito, **então** vejo o contador; o campo é **obrigatório** e **≥150 caracteres** garantem o acréscimo.

### RF-064 · Compartilhamento

- **Dado** que estou na etapa 3, **quando** escolho Playlist, Post Instagram, Matéria ou Outros, **então** o acréscimo entra na remuneração após a conferência da equipe.
- **Dado** que marco **"Não vou compartilhar desta vez"**, **quando** confirmo, **então** o crédito é liberado do mesmo jeito, sem o acréscimo.

⚠️ O board condiciona a liberação do crédito ao compartilhamento **confirmado**; o protótipo libera nos dois caminhos. O PRD adotou o protótipo — confirmar se o acréscimo deve ficar retido até a verificação.

### RF-065 · Outras formas de divulgação

- **Dado** que escolhi "Outros", **quando** avanço, **então** preciso especificar o canal (rádio, podcast etc.).

### RF-066 · Remuneração por classe

- **Dado** que chego à etapa 5, **quando** ela carrega, **então** vejo classe atual, **piso** conforme o prazo, **acréscimos** item a item com rótulo e valor, **teto** da classe e **"Você recebe"**.
- **Dado** que entreguei **dentro de 72h**, **quando** o cálculo roda, **então** o piso é **38%** (Bronze), **43%** (Prata) ou **50%** (Ouro).
- **Dado** que entreguei **após 72h**, **quando** o cálculo roda, **então** o piso é 30/40/45% e o **acumulado é limitado a 50%**.
- **Dado** que cumpri opcionais, **quando** o cálculo roda, **então** os acréscimos somam **até o teto** da classe (50/55/62%).

> **Decisão do cliente (2026-09-16, [#5](open-questions.md)):** vale a tabela
> do board. O protótipo da R2 sugeria piso de 30% no prazo; essa leitura foi
> descartada. Implementado pela migration `0009b_remuneracao_da_tabela`.

### RF-067 · Concluir e liberar crédito

- **Dado** que a escuta, os critérios obrigatórios e o feedback estão válidos, **quando** aciono "Concluir e liberar crédito", **então** a avaliação é gravada, o ganho é criado, o envio vira "pronto", o artista recebe a devolutiva e o crédito entra no financeiro do curador — **tudo em uma única transação**.
- **Dado** que qualquer etapa falha, **quando** a transação aborta, **então** nada é gravado parcialmente.

### RF-068 · Salvar e sair

- **Dado** que estou em qualquer etapa, **quando** aciono "Salvar e sair", **então** o rascunho é preservado e retomo no mesmo passo.

**Rastreabilidade (RF-058 a RF-068):** [03 · módulo 14](prd/03-ambiente-curador.md#14-avaliações--notas--feedback) · [01 §3 e §5](prd/01-regras-de-negocio.md#3-remuneração-por-classe) · Guia de Testes R2

---

## 10. SLA e devolução automática

**Release 2.**

### RF-069 · Aviso de prazo

- **Dado** que o prazo de 72h está próximo, **quando** o job roda, **então** o curador é notificado — evento **crítico, não desativável**.

### RF-070 · Devolução em 7 dias

- **Dado** que o curador não respondeu em **7 dias**, **quando** o job roda, **então** a Clave volta para a carteira do artista, a faixa **sai da fila** do curador, o lançamento aparece no extrato como devolvido e ambos são notificados.
- **Dado** que o crédito foi devolvido, **quando** o financeiro do curador é calculado, **então** ele **não entra como ganho**.

### RF-071 · Estados do envio

- **Dado** que o envio avança, **quando** cada ação ocorre, **então** o estado muda em `Recebeu → Ouviu → Avaliando → Pronto` e fica disponível para o Status de envio (3.3, R3).

**Rastreabilidade:** [01 §6](prd/01-regras-de-negocio.md#6-sla-e-ciclo-de-vida-do-envio)

---

## 11. Requisitos de R3 a R5

Nível de módulo — sem protótipo, a fonte é o board. Detalhamento antes de cada release.

| RF | Módulo | Release | Requisito |
|---|---|---|---|
| RF-072 | 4 — Seleção de curadores | R3 | Pesquisar, filtrar (gênero com matching, classe, serviço, preço), comparar por ranking e calibração, montar seleção e confirmar aplicando Claves. Não permitir o mesmo curador duas vezes na mesma música |
| RF-073 | 3.3 — Status de envio | R3 | Acompanhar barras por curador com etapa, prazo e classe |
| RF-074 | 16 — Métricas de performance | R3 | Exibir ranking com os 4 componentes e pesos, calibração por faixa, histórico e progressão Prata→Ouro com checklist |
| RF-075 | 20 — Gestão de usuários | R3 | Listar, filtrar, abrir detalhe, bloquear/excluir com motivo, aprovar/recusar Prata, abrir dossiê e decidir sobre Ouro — tudo logado |
| RF-076 | 23 — Moderação e antifraude | R3 | Logs, denúncias com julgamento (penalidade só após procedência) e bloqueio manual com motivo |
| RF-077 | 2 — Dashboard do artista | R4 | Saldo, nota média, tabela NO/NS/NF e prévia do relatório |
| RF-078 | 2.1 / 6.1 — Relatórios IA | R4 | Relatório da música após **≥ metade** dos curadores; relatório do artista com histórico suficiente; exportação em PDF; estado "dados insuficientes" |
| RF-079 | 6 — Catálogo e análises | R4 | Catálogo, detalhe da música, análise por curador, avaliação sigilosa do curador e envio de material para matéria |
| RF-080 | 15 — Financeiro do curador | R4 | Extrato por curadoria (base, acréscimos, penalidade, líquido) e solicitação de saque |
| RF-081 | 24 — Dashboard admin | R4 | KPIs de usuários, envios, Claves, SLA 72h, calibração média e pendências de decisão |
| RF-082 | 10 / 18 — Centrais de notificação | R5 | Listar, filtrar, abrir detalhe com contexto e configurar canais; eventos críticos não desativáveis |
| RF-083 | 22 — Financeiro da plataforma | R5 | Rateio com invariante `repasse + comissão = transação`, relatórios exportáveis, estornos e payouts em lote |
| RF-084 | 26 — Homepage pública | R5 | Vitrine sem login com compartilhados, destaques, ranking e CTA. ⚠️ Critérios derivados, a validar |

---

# Requisitos não funcionais

## Segurança

- **RNF-001** — Senha com **≥8 caracteres e ao menos 1 número**; armazenamento apenas como hash (Supabase Auth).
- **RNF-002** — Token de redefinição de **60 minutos, uso único**; link de verificação de e-mail de **24 horas**.
- **RNF-003** — Toda tabela com **RLS habilitada** e policies explícitas; escritas em ledger e em ganhos só por RPC `security definer`.
- **RNF-004** — Alteração de e-mail ou senha exige reautenticação e **encerra as demais sessões**.
- **RNF-005** — Sessão admin com expiração e **log de acessos**; 2FA sugerido, a alinhar.
- **RNF-006** — Arquivos de áudio em bucket privado, servidos por **URL assinada** apenas a quem tem envio ativo da faixa.

## Integridade financeira

- **RNF-007** — Dinheiro sempre em **inteiros de centavos**; Claves em `numeric(10,2)`. Ponto flutuante é proibido no domínio financeiro.
- **RNF-008** — Saldo **derivado do ledger**, nunca de coluna denormalizada.
- **RNF-009** — Webhook de pagamento **idempotente** por `id_evento_provedor`.
- **RNF-010** — Invariante em toda transação: `repasse + comissão = valor da transação`.
- **RNF-011** — Nenhum número de negócio hardcoded — todos vêm de `configuracao`.

## Acessibilidade e interface

- **RNF-012** — Piso **WCAG 2.1 AA**: contraste, anel de foco visível, alvo de toque, rótulo associado, `aria-sort` em tabelas ordenáveis, foco preso em modal com ESC e clique-fora.
- **RNF-013** — Todas as listas e tabelas tratam **loading, erro e vazio** explicitamente — no beta tudo começa sem dados.
- **RNF-014** — Interface em **pt-BR, es e en**; a devolutiva chega no idioma em que o curador escreveu.

## Qualidade e conformidade

- **RNF-015** — CI obrigatório com typecheck, lint, testes e build; cobertura obrigatória em remuneração por classe, saldo derivado e schemas Zod. Os **16 cenários do Guia de Testes da R2** cobertos por E2E.
- **RNF-016** — LGPD: aceite no cadastro, exportação em `.zip` antes da exclusão, desativação imediata e expurgo em **30 dias**; bloqueio e exclusão pelo admin sempre com motivo registrado.
