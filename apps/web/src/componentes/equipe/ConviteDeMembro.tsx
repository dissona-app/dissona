'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Modal } from '@/componentes/base/Modal';
import { Selecao } from '@/componentes/base/Selecao';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import type { DadosDoConvite } from '@/modulos/equipe/acoes';
import { PAPEIS_ADMIN } from '@/modulos/equipe/tipos';
import { erroGeralDe } from '@/textos/erros';
import { EQUIPE } from '@/textos/prototipo';

import estilos from './ConviteDeMembro.module.css';

const { convite: TEXTOS } = EQUIPE;

const MOTIVOS: Readonly<Record<string, string>> = {
  email_vazio: TEXTOS.erroEmailVazio,
  email_invalido: TEXTOS.erroEmailInvalido,
  papel_invalido: TEXTOS.erroPapelInvalido,
};

const OPCOES_DE_PAPEL = PAPEIS_ADMIN.map((papel) => ({
  valor: papel.valor,
  rotulo: papel.rotulo,
}));

/** `PAPEIS_ADMIN` é uma tupla `as const`, então o primeiro existe de verdade. */
const PAPEL_PADRAO = PAPEIS_ADMIN[0].valor;

export type PropsConviteDeMembro = {
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao<DadosDoConvite>>;
};

/**
 * "Convidar membro" (27.3) — o botão e o diálogo.
 *
 * O botão vive aqui, e não na lista, porque quem sabe se o diálogo está aberto
 * é este componente. A lista o recebe como `children` e o põe no lugar certo do
 * cabeçalho.
 *
 * ## O modal não fecha no sucesso
 *
 * Ao contrário dos modais de credencial (7.4), este permanece aberto para
 * mostrar o **link** do convite. Enquanto o SMTP é o embutido do Supabase
 * (~2 e-mails por hora), esse link é a única garantia de que o convite chega —
 * e ele existe uma vez só. Fechar o diálogo o perderia.
 *
 * Isso sai quando houver provedor real ([#10](docs/open-questions.md)); então o
 * modal passa a fechar como os outros.
 */
export function ConviteDeMembro({ acao }: PropsConviteDeMembro) {
  const [aberto, setAberto] = useState(false);

  const [resultado, enviar, pendente] = useActionState<
    ResultadoDeAcao<DadosDoConvite> | null,
    FormData
  >(async (_anterior, dados) => acao(dados), null);

  const enviado = resultado !== null && resultado.ok ? resultado.dados : undefined;
  const falhou = resultado !== null && !resultado.ok;

  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // Os dois códigos com banner próprio saem da conta; o resto — `CONFLITO` de
  // convite repetido, `NAO_AUTENTICADO` — cai na superfície geral.
  const limiteDeEnvio = falhou && resultado.codigo === CodigoErro.LIMITE_DE_ENVIO;
  const semPermissao = falhou && resultado.codigo === CodigoErro.NAO_AUTORIZADO;
  const erroGeral = erroGeralDe(
    falhou ? resultado : null,
    [erroDe('email'), erroDe('papel')],
    limiteDeEnvio || semPermissao,
  );

  return (
    <>
      <Botao tamanho="denso" onClick={() => setAberto(true)}>
        {EQUIPE.equipe.convidar}
      </Botao>

      <Modal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        overline={TEXTOS.overline}
        titulo={TEXTOS.titulo}
        descricao={TEXTOS.texto}
        largura="estreita"
      >
        {enviado === undefined ? (
          <form action={enviar} className={estilos.formulario} noValidate>
            {limiteDeEnvio ? <Aviso tom="alerta">{TEXTOS.erroLimite}</Aviso> : null}

            {semPermissao ? <Aviso tom="erro">{TEXTOS.erroSemPermissao}</Aviso> : null}

            {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

            <Campo
              name="email"
              type="email"
              rotulo={TEXTOS.rotuloEmail}
              placeholder={TEXTOS.placeholderEmail}
              autoComplete="off"
              required
              erro={erroDe('email')}
            />

            <Selecao
              name="papel"
              rotulo={TEXTOS.rotuloPapel}
              defaultValue={PAPEL_PADRAO}
              opcoes={OPCOES_DE_PAPEL}
              erro={erroDe('papel')}
            />

            <div className={estilos.acoes}>
              <Botao type="submit" carregando={pendente}>
                {pendente ? TEXTOS.enviando : TEXTOS.enviar}
              </Botao>
              <Botao
                type="button"
                variante="neutro"
                onClick={() => setAberto(false)}
                disabled={pendente}
              >
                {TEXTOS.cancelar}
              </Botao>
            </div>
          </form>
        ) : (
          <div className={estilos.formulario}>
            <Aviso tom="sucesso">{TEXTOS.sucesso(enviado.email)}</Aviso>

            {enviado.jaTinhaConta ? <Aviso tom="info">{TEXTOS.jaTinhaConta}</Aviso> : null}

            <div className={estilos.blocoDoLink}>
              <span className={estilos.linkTitulo}>{TEXTOS.linkTitulo}</span>
              {/* `readOnly` num `<input>`, e não um `<code>`: é o que permite
                  selecionar tudo com um clique e copiar com o teclado, sem
                  depender da API de clipboard (que exige permissão e HTTPS). */}
              <input
                className={estilos.link}
                value={enviado.link}
                readOnly
                onFocus={(evento) => evento.currentTarget.select()}
                aria-label={TEXTOS.linkTitulo}
              />
              <span className={estilos.linkNota}>{TEXTOS.linkNota}</span>
            </div>

            <div className={estilos.acoes}>
              <Botao type="button" onClick={() => setAberto(false)}>
                {TEXTOS.fechar}
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
