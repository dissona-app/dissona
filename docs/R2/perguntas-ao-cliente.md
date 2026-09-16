# Perguntas ao cliente · 2026-09-08, atualizado em 2026-09-10

Cinco decisões que a implementação expôs. As quatro primeiras não bloqueiam o
desenvolvimento hoje — estão implementadas com um default explícito e
reversível — mas as duas iniciais precisam de resposta **antes da tela 14.4
(Remuneração por classe)** e do cenário C6. **A quinta bloqueia**: sem ela, o
login por SoundCloud não sai do lugar.

A quarta apareceu ao portar a tela de login e é a mais barata de resolver: é
uma linha de texto.

Contexto para as duas primeiras: o protótipo da R2 é a fonte de maior
autoridade ([AGENTS.md](../../AGENTS.md)), e o cálculo de remuneração dele
difere da tabela do board não nos números, mas no **significado** deles.

---

## 1 · Um Bronze no prazo recebe 30% ou 38%?

> ✅ **Respondida em 2026-09-16: 38% — vale a tabela do board.** Implementada
> pela migration `0009b_remuneracao_da_tabela`.

A tabela de remuneração tem três números por classe: Bronze 30/38/50,
Prata 40/43/55, Ouro 45/50/62.

O board os descreve como **(piso em atraso, piso no prazo, teto)**. O protótipo
os trata como **(piso dentro das 72h, teto na avaliação, teto com
compartilhamento)** — e as legendas da própria tela dizem isso:

> *"Piso da classe dentro das 72h"* — exibindo **30%** para Bronze
> *"Teto da classe Bronze: 38% na avaliação e 50% com compartilhamento"*

A diferença prática:

| Situação | Leitura do board | Leitura do protótipo |
|---|---|---|
| Bronze, no prazo, sem nenhum opcional | 38% | **30%** |
| Bronze, no prazo, com os três opcionais de conteúdo | 41% (capado em 50%) | 38% |
| Bronze, no prazo, com tudo mais compartilhamento | 50% | 46% |
| Bronze, atrasado, sem opcionais | 30% | **22%** |

**Pergunta:** confirma que um curador Bronze que entrega dentro das 72 horas,
sem responder os onze critérios e sem compartilhar, recebe **30%** do valor
pago pelo artista?

*Está implementado assim. Se a resposta for a leitura do board, a correção é
uma linha de configuração mais um ajuste na função de cálculo.*

---

## 2 · Falta um acréscimo de 4 pontos, ou o teto é aspiracional?

> ✅ **Superada pela resposta da pergunta 1.** Com a tabela do board há um teto
> único, e os acréscimos o alcançam nas três classes.

Somando os acréscimos que o protótipo concede — três de 3 pontos (responder os
onze critérios, justificar, feedback longo) e 8 pontos de compartilhamento — o
máximo que um curador consegue alcançar não chega ao teto declarado:

| Classe | Máximo alcançável | Teto declarado | Folga |
|---|---|---|---|
| Bronze | 46% | 50% | **4 pontos** |
| Prata | 51% | 55% | **4 pontos** |
| Ouro | 58% | 62% | **4 pontos** |

Quatro pontos exatos nas três classes é regular demais para ser acidente.

**Pergunta:** existe um quinto acréscimo que não chegou à especificação (qual?),
ou o teto da classe é uma meta aspiracional que o conjunto atual de opcionais
não atinge?

*Importa porque a tela 14.4 exibe o teto da classe. Se ele nunca é atingível, o
curador vê uma meta que não existe.*

---

## 3 · Para o jurídico: apagar em 30 dias versus retenção fiscal

A Política de privacidade promete apagar a conta em 30 dias. Mas:

- o extrato de Claves é **append-only** por desenho, e é dele que o saldo é
  derivado — apagá-lo destruiria a conciliação financeira;
- os pedidos de compra e os ganhos dos curadores têm **retenção fiscal**;
- a devolutiva já paga **permanece com o curador por obrigação contratual**,
  conforme as próprias regras de negócio.

A leitura implementada é **anonimizar**: zerar nome, apelido, foto, cidade,
dados de cobrança e chave Pix; apagar credenciais, mídias e notificações;
preservar as linhas financeiras e a avaliação, com o vínculo interno intacto
para a conciliação continuar possível.

**Perguntas:** essa leitura atende à LGPD? Qual o prazo de retenção fiscal a
aplicar? E o texto de `/privacidade` precisa ser reescrito para descrever o que
de fato acontece — hoje ele promete mais do que o sistema pode cumprir sem
descumprir outra obrigação.

---

## 4 · A home promete "100% da faixa ouvida". O gate é 60%.

Os dois textos estão no **mesmo** conjunto de protótipos, e se contradizem:

> Tela 1, prova social sob o card de login: *"7 dias para a devolutiva · até 11
> critérios com nota · **100% da faixa ouvida**"*
>
> Tela 14, acima do player: *"A escuta é medida. A avaliação só é aceita a
> partir de **60% da faixa** ouvidos."*

A segunda é a regra implementada (`configuracao.escuta_minima_percentual = 60`)
e a que o cenário C3 verifica. Então a primeira é uma promessa que o produto
não cumpre — e ela está exatamente onde o artista decide se confia na
plataforma.

**Implementado por ora:** *"escuta medida e registrada"*, que é verdade nos
dois casos e não promete um número.

**Perguntas:** o gate deve subir para 100%, ou a copy da home desce? Se o gate
subir, note que ele muda o cálculo de nada — é `configuracao`, um `update` — mas
muda o produto: um curador que ouviu 95% de uma faixa de seis minutos passa a
não poder entregar a avaliação que já escreveu.

*Se preferirem um número na home, "60% da faixa ouvida, no mínimo" é
verificável e ainda é um diferencial — quase nenhuma plataforma mede escuta.*

---

## 5 · O SoundCloud custa uma assinatura, e não entrega o e-mail

Pesquisamos a API deles em 2026-09-10. Duas notícias.

**A boa:** desde 18/05/2026 as credenciais são self-serve — nada de formulário
de análise nem de fila, que era o risco registrado desde o discovery. O OAuth
deles é padrão, e o Supabase passou a aceitar provedores customizados: o login
por SoundCloud deixou de ser um fluxo que teríamos de escrever e manter por
conta própria.

**As duas ruins:**

1. **Registrar a aplicação exige assinatura Artist Pro** — ~US$ 8,25/mês, ou
   US$ 99 no ano, numa conta da Dissona. É custo fixo da plataforma, e sem ele
   não existem credenciais.
2. **A API não devolve o e-mail do usuário.** O perfil que ela entrega tem
   nome, foto e link — e um campo que apenas diz *se* o e-mail foi confirmado,
   não qual é. Não há permissão que libere o endereço; o pedido foi aberto na
   comunidade deles em 2022 e fechado sem entrega.

O item 2 contradiz uma promessa que está no protótipo, no pé do cadastro:
*"Google, Facebook ou SoundCloud preenchem seu nome e e-mail. Você confirma
antes de criar."* Pelo Google e pelo Facebook, sim. Pelo SoundCloud, o nome vem
e o e-mail não — e aqui o e-mail não é enfeite de perfil: é o identificador da
conta e o canal de verificação, de recuperação de senha e de aviso de prazo.

**Perguntas:**

1. A plataforma assina o Artist Pro? Se não, o provedor sai das telas de login
   e de cadastro, e a copy muda com ele.
2. Se sim, como pedimos o e-mail que o SoundCloud não dá? Já existe uma tela de
   confirmação depois do login social — colher o endereço ali é o caminho mais
   curto. A alternativa é o SoundCloud servir só para **entrar**, para quem já
   criou a conta por outro caminho.

*Enquanto não houver resposta, o botão continua na tela, desabilitado e com o
motivo visível — a mesma decisão que vale para o resto do que ainda não entrou.*

**Custo de implementar, depois do "sim":** pequeno. O provedor é configuração no
Supabase, e o único ponto técnico a provar é se o perfil deles precisa de uma
tradução nossa no meio.
