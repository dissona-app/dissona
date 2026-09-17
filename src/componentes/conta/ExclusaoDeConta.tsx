'use client';

import { useActionState, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { Modal } from '@/componentes/base/Modal';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { erroGeralDe } from '@/textos/erros';
import { CONTA } from '@/textos/prototipo';

import estilos from './ExclusaoDeConta.module.css';

export type ArquivoDeExportacao = { readonly url: string; readonly nome: string };

export type PropsExclusaoDeConta = {
  readonly aberto: boolean;
  readonly onFechar: () => void;
  readonly acaoDeExportar: () => Promise<ResultadoDeAcao<ArquivoDeExportacao>>;
  readonly acaoDeExcluir: (dados: FormData) => Promise<ResultadoDeAcao>;
};

const MOTIVOS: Readonly<Record<string, string>> = {
  senha_atual_vazia: CONTA.erroSenhaAtualVazia,
  palavra_incorreta: CONTA.erroPalavra,
};

/**
 * Exclusão de conta em dois passos (RF-024).
 *
 * ## Por que a exportação vem antes, e não depois
 *
 * O protótipo põe "Leve seus dados antes" como passo 1, e a ordem é a
 * substância: depois de desativar, o acesso acaba. Oferecer a exportação depois
 * seria oferecê-la a quem já não pode usá-la.
 *
 * A exportação **não** é obrigatória para seguir — quem não quer os dados não
 * deveria ter de baixá-los para poder sair. "Continuar" está sempre ativo, e o
 * passo 1 é uma oferta, não um pedágio.
 *
 * ## O download é um `<a download>`, não um redirecionamento
 *
 * A ação devolve uma URL assinada de 24 horas, e a tela a oferece como link. Um
 * `redirect` para o arquivo levaria a pessoa embora do fluxo de exclusão, no
 * meio dele.
 *
 * `persistente` nos dois passos: é a confirmação destrutiva de que o Design
 * System §3.4 fala, e um ESC no lugar errado aqui apaga uma conta.
 */
export function ExclusaoDeConta({
  aberto,
  onFechar,
  acaoDeExportar,
  acaoDeExcluir,
}: PropsExclusaoDeConta) {
  const [passo, setPasso] = useState<1 | 2>(1);

  const [exportacao, exportar, exportando] = useActionState<
    ResultadoDeAcao<ArquivoDeExportacao> | null,
    FormData
  >(async () => acaoDeExportar(), null);

  const [exclusao, excluir, excluindo] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acaoDeExcluir(dados),
    null,
  );

  const arquivo = exportacao !== null && exportacao.ok ? exportacao.dados : undefined;
  const falhouAExportacao = exportacao !== null && !exportacao.ok;
  const falhou = exclusao !== null && !exclusao.ok;

  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    if (campo === 'senhaAtual' && exclusao.codigo === CodigoErro.REAUTENTICACAO_INVALIDA) {
      return CONTA.erroSenhaAtual;
    }
    const motivo = exclusao.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // A exclusão recusa por papel, por sessão e por conflito sem tocar em campo —
  // e o botão vermelho ficava mudo, que é o pior lugar possível para ficar.
  const erroGeral = erroGeralDe(falhou ? exclusao : null, [
    erroDe('senhaAtual'),
    erroDe('confirmacao'),
  ]);

  function fechar() {
    // Volta ao passo 1 ao fechar: reabrir direto no passo 2 apresentaria o
    // campo `EXCLUIR` a quem só quis reler o que a exclusão faz.
    setPasso(1);
    onFechar();
  }

  const textos = passo === 1 ? CONTA.modalExportar : CONTA.modalExcluir;

  return (
    <Modal
      aberto={aberto}
      onFechar={fechar}
      overline={textos.overline}
      // O vermelho aparece no passo que apaga, e só nele. No passo 1 o assunto
      // é LGPD, não perda.
      tomDoOverline={passo === 1 ? 'neutro' : 'perigo'}
      titulo={textos.titulo}
      descricao={textos.texto}
      persistente
    >
      {passo === 1 ? (
        <div className={estilos.corpo}>
          <div className={estilos.arquivo}>
            <span className={estilos.arquivoTextos}>
              <span className={estilos.arquivoNome}>
                {arquivo?.nome ?? CONTA.modalExportar.nomePrevio}
              </span>
              <span className={estilos.arquivoNota}>
                {arquivo === undefined ? CONTA.modalExportar.subrotulo : CONTA.modalExportar.pronto}
              </span>
            </span>

            {arquivo === undefined ? (
              <form action={exportar}>
                <Botao type="submit" variante="secundario" tamanho="denso" carregando={exportando}>
                  {exportando ? CONTA.modalExportar.exportando : CONTA.modalExportar.exportar}
                </Botao>
              </form>
            ) : (
              <a className={estilos.baixar} href={arquivo.url} download={arquivo.nome}>
                {CONTA.modalExportar.baixar}
              </a>
            )}
          </div>

          {arquivo !== undefined ? <Aviso tom="sucesso">{CONTA.modalExportar.aviso}</Aviso> : null}
          {falhouAExportacao ? <Aviso tom="erro">{CONTA.erroExportacao}</Aviso> : null}

          <div className={estilos.acoes}>
            {/* Primário, e não vermelho: no passo 1 nada é apagado ainda, e o
                protótipo reserva o vermelho cheio para o botão que apaga.
                Sempre ativo — a exportação é oferta, não pedágio. */}
            <Botao type="button" onClick={() => setPasso(2)}>
              {CONTA.modalExportar.continuar}
            </Botao>
            <Botao type="button" variante="neutro" onClick={fechar}>
              {CONTA.modalExportar.cancelar}
            </Botao>
          </div>
        </div>
      ) : (
        <form action={excluir} className={estilos.corpo} noValidate>
          {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

          <Campo
            name="senhaAtual"
            type="password"
            rotulo={CONTA.modalExcluir.rotuloAtual}
            placeholder={CONTA.modalExcluir.placeholderAtual}
            autoComplete="current-password"
            required
            erro={erroDe('senhaAtual')}
          />

          <Campo
            name="confirmacao"
            type="text"
            rotulo={CONTA.modalExcluir.rotuloConfirmacao}
            placeholder={CONTA.modalExcluir.placeholderConfirmacao}
            // O campo pede uma palavra exata em maiúsculas, e o teclado do
            // celular "ajudaria" transformando-a em "Excluir".
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            required
            erro={erroDe('confirmacao')}
          />

          <div className={estilos.acoes}>
            <Botao type="submit" variante="perigo" carregando={excluindo}>
              {excluindo ? CONTA.modalExcluir.enviando : CONTA.modalExcluir.enviar}
            </Botao>
            {/* "Cancelar" volta ao passo 1, não fecha: quem chegou aqui pode
                querer o arquivo que recusou antes de confirmar. */}
            <Botao type="button" variante="neutro" onClick={() => setPasso(1)} disabled={excluindo}>
              {CONTA.modalExcluir.cancelar}
            </Botao>
          </div>
        </form>
      )}
    </Modal>
  );
}
