'use client';

import { useActionState, useEffect, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { MedidorDeSenha } from '@/componentes/base/MedidorDeSenha';
import { Modal } from '@/componentes/base/Modal';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { erroGeralDe } from '@/textos/erros';
import { CADASTRAR, CONTA } from '@/textos/prototipo';

import { IconeOlho } from '@/componentes/autenticacao/IconeOlho';
import estilos from './ModalDeCredencial.module.css';

export type TipoDeCredencial = 'senha' | 'email';

export type PropsModalDeCredencial = {
  readonly tipo: TipoDeCredencial;
  readonly aberto: boolean;
  readonly onFechar: () => void;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  /** Aviso a mostrar na tela depois de fechar. A tela é dona dele. */
  readonly onSucesso: (mensagem: string) => void;
};

const MOTIVOS: Readonly<Record<string, string>> = {
  senha_atual_vazia: CONTA.erroSenhaAtualVazia,
  senha_fraca: CONTA.erroSenhaFraca,
  confirmar_vazio: CONTA.erroConfirmarVazio,
  senhas_diferentes: CONTA.erroSenhasDiferentes,
  email_vazio: CONTA.erroEmailVazio,
  email_invalido: CONTA.erroEmailInvalido,
};

/**
 * Os dois modais de reautenticação — trocar senha e trocar e-mail.
 *
 * Um componente para os dois porque eles são a mesma coisa com um campo de
 * diferença: os dois pedem a senha atual (RNF-004), os dois mostram o mesmo
 * aviso de reautenticação, e os dois fecham com um aviso de sucesso na tela de
 * trás. O protótipo os escreve inteiros, dois blocos quase idênticos, e é onde
 * o texto do "Cancelar" divergiu entre eles.
 *
 * ## O sucesso é da tela, não do modal
 *
 * O modal fecha e chama `onSucesso` com a mensagem. Mostrar o aviso dentro dele
 * obrigaria a pessoa a fechar um diálogo para ler que deu certo — e o que ela
 * quer ver depois de trocar a senha é a tela de segurança, com a data nova.
 *
 * `persistente`: fechar por ESC no meio de uma troca de credencial perderia o
 * que foi digitado, e o Design System reserva esse comportamento justamente
 * para confirmação que custa caro.
 */
export function ModalDeCredencial({
  tipo,
  aberto,
  onFechar,
  acao,
  onSucesso,
}: PropsModalDeCredencial) {
  const textos = tipo === 'senha' ? CONTA.modalSenha : CONTA.modalEmail;

  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [senha, setSenha] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [email, setEmail] = useState('');

  const falhou = resultado !== null && !resultado.ok;

  // O fechamento no sucesso é efeito de verdade: sincroniza o estado do modal
  // com o resultado de uma ação do servidor, que é externo ao React.
  useEffect(() => {
    if (resultado === null || !resultado.ok) return;
    onSucesso(tipo === 'senha' ? CONTA.modalSenha.sucesso : CONTA.modalEmail.sucesso(email));
    onFechar();
  }, [resultado, tipo, email, onSucesso, onFechar]);

  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    if (campo === 'senhaAtual' && resultado.codigo === CodigoErro.REAUTENTICACAO_INVALIDA) {
      return CONTA.erroSenhaAtual;
    }
    if (campo === 'email' && resultado.codigo === CodigoErro.EMAIL_JA_CADASTRADO) {
      return CONTA.erroEmailExistente;
    }
    const motivo = resultado.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // Só os campos que este modo desenha contam como "pintado": em modo e-mail o
  // erro de `senha` não está em lugar nenhum da tela, e tratá-lo como pintado
  // devolveria a recusa silenciosa pela porta dos fundos.
  const limiteDeEnvio = falhou && resultado.codigo === CodigoErro.LIMITE_DE_ENVIO;
  const erroGeral = erroGeralDe(
    falhou ? resultado : null,
    tipo === 'senha'
      ? [erroDe('senhaAtual'), erroDe('senha'), erroDe('confirmar')]
      : [erroDe('senhaAtual'), erroDe('email')],
    limiteDeEnvio,
  );

  const olho = (
    <button
      type="button"
      className={estilos.olho}
      onClick={() => setVisivel((atual) => !atual)}
      aria-pressed={visivel}
      aria-label={visivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
      title={visivel ? CADASTRAR.ocultarSenha : CADASTRAR.mostrarSenha}
    >
      <IconeOlho riscado={visivel} />
    </button>
  );

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      overline={textos.overline}
      titulo={textos.titulo}
      descricao={textos.texto}
      largura="estreita"
      persistente
    >
      <form action={enviar} className={estilos.formulario} noValidate>
        {limiteDeEnvio ? (
          <Aviso tom="alerta" titulo={CONTA.erroLimite}>
            {textos.texto}
          </Aviso>
        ) : null}

        {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

        <Campo
          name="senhaAtual"
          type="password"
          rotulo={textos.rotuloAtual}
          placeholder={textos.placeholderAtual}
          autoComplete="current-password"
          required
          erro={erroDe('senhaAtual')}
        />

        {tipo === 'senha' ? (
          <>
            <div className={estilos.blocoSenha}>
              <Campo
                name="senha"
                type={visivel ? 'text' : 'password'}
                rotulo={CONTA.modalSenha.rotuloNova}
                placeholder={CONTA.modalSenha.placeholderNova}
                autoComplete="new-password"
                required
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                erro={erroDe('senha')}
                acao={olho}
              />
              <MedidorDeSenha
                senha={senha}
                rotulos={CADASTRAR.forcaDaSenha}
                requisitos={{
                  tamanho: CADASTRAR.requisitoTamanho,
                  numero: CADASTRAR.requisitoNumero,
                }}
              />
            </div>

            <Campo
              name="confirmar"
              type={visivel ? 'text' : 'password'}
              rotulo={CONTA.modalSenha.rotuloConfirmar}
              placeholder={CONTA.modalSenha.placeholderConfirmar}
              autoComplete="new-password"
              required
              erro={erroDe('confirmar')}
            />
          </>
        ) : (
          <Campo
            name="email"
            type="email"
            rotulo={CONTA.modalEmail.rotuloEmail}
            placeholder={CONTA.modalEmail.placeholderEmail}
            autoComplete="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            erro={erroDe('email')}
          />
        )}

        {/* Confirmação antes do "Cancelar", como no protótipo: a ação que a
            pessoa veio fazer é a primeira que ela alcança pelo teclado. */}
        <div className={estilos.acoes}>
          <Botao type="submit" carregando={pendente}>
            {pendente ? textos.enviando : textos.enviar}
          </Botao>
          <Botao type="button" variante="neutro" onClick={onFechar} disabled={pendente}>
            {textos.cancelar}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
