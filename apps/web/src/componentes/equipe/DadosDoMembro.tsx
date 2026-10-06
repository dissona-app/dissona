'use client';

import { useActionState, useCallback, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { Campo } from '@/componentes/base/Campo';
import { CampoDeFoto } from '@/componentes/base/CampoDeFoto';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { ModalDeCredencial } from '@/componentes/conta/ModalDeCredencial';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { formatarDataLonga } from '@/lib/formato';
import { rotuloDoPapel } from '@/modulos/equipe/tipos';
import type { PapelAdmin } from '@/modulos/equipe/tipos';
import { erroGeralDe } from '@/textos/erros';
import { CONTA, EQUIPE } from '@/textos/prototipo';

import estilos from './DadosDoMembro.module.css';

const { dados: TEXTOS } = EQUIPE;

const MOTIVOS: Readonly<Record<string, string>> = {
  nome_vazio: TEXTOS.erroNomeVazio,
  nome_longo: TEXTOS.erroNomeLongo,
  cargo_longo: TEXTOS.erroCargoLongo,
  foto_tipo: TEXTOS.erroFotoTipo,
  foto_tamanho: TEXTOS.erroFotoTamanho,
  foto_ausente: TEXTOS.erroFotoAusente,
  foto_alheia: TEXTOS.erroFotoAlheia,
};

export type PropsDadosDoMembro = {
  readonly nome: string;
  readonly cargo: string | null;
  readonly email: string;
  readonly papelAdmin: PapelAdmin;
  readonly senhaAlteradaEm: string | null;
  /** Caminho da foto atual no bucket `avatares`, e a URL pública já montada. */
  readonly fotoCaminho: string | null;
  readonly fotoUrl: string | null;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeSenha: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeEmail: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * "Dados pessoais" (27.1) — nome, cargo, e-mail e senha.
 *
 * ## O e-mail e a senha reusam os modais de Conta
 *
 * `ModalDeCredencial` e as ações de `modulos/conta` são as **mesmas** de 7.4 e
 * 17.4. O protótipo escreve os textos idênticos nos três ambientes, e a regra é
 * idêntica: reautentica com a senha atual, troca, encerra as outras sessões. Um
 * segundo caminho de troca de senha só para o admin seria um segundo lugar para
 * esquecer o `signOut({ scope: 'others' })`.
 *
 * ## "Alterada em 12 de março de 2026"
 *
 * É a única das três telas de Conta que mostra a data — e é o motivo de
 * `perfil.senha_alterada_em` existir (0001c). Quem nunca trocou vê a segunda
 * metade da frase sozinha, em vez de uma data inventada.
 *
 * ## A foto
 *
 * O protótipo declara a pendência — ao clicar em "Trocar foto" ele mesmo diz
 * *"Upload de imagem entra no próximo release."* —, e o botão aqui ficou
 * desabilitado por isso. Passou a funcionar quando o perfil do artista (7.1)
 * ganhou foto: coluna, bucket e policy são os mesmos, e o `CampoDeFoto` é o
 * mesmo componente das três telas.
 */
export function DadosDoMembro({
  nome,
  cargo,
  email,
  papelAdmin,
  senhaAlteradaEm,
  fotoCaminho,
  fotoUrl,
  acao,
  acaoDeSenha,
  acaoDeEmail,
}: PropsDadosDoMembro) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [modal, setModal] = useState<'senha' | 'email' | null>(null);
  // Salvar com a foto ainda subindo mandaria `foto_caminho` vazio.
  const [subindoFoto, setSubindoFoto] = useState(false);
  const [avisoDeCredencial, setAvisoDeCredencial] = useState<string | null>(null);

  const fechar = useCallback(() => setModal(null), []);
  const anunciar = useCallback((mensagem: string) => setAvisoDeCredencial(mensagem), []);

  const falhou = resultado !== null && !resultado.ok;
  const erroDe = (campo: string): string | undefined => {
    if (!falhou) return undefined;
    const motivo = resultado.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // "Salvar" recusado por papel ou por sessão não pintava campo nenhum.
  const erroGeral = erroGeralDe(falhou ? resultado : null, [
    erroDe('nome'),
    erroDe('cargo'),
    erroDe('foto'),
  ]);

  const notaDaSenha =
    senhaAlteradaEm === null
      ? TEXTOS.senhaNotaSemData
      : TEXTOS.senhaNota(formatarDataLonga(new Date(senhaAlteradaEm)));

  return (
    <section className={estilos.base} aria-label={EQUIPE.abas.dados}>
      <form action={enviar} className={estilos.corpo} noValidate>
        {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

        {erroDe('foto') === undefined ? null : <Aviso tom="erro">{erroDe('foto')}</Aviso>}

        <div className={estilos.identidade}>
          <CampoDeFoto
            nome={nome}
            fotoUrl={fotoUrl}
            caminhoAtual={fotoCaminho}
            aoMudarEnvio={setSubindoFoto}
            tamanho="md"
            textos={{
              botao: TEXTOS.trocarFoto,
              hint: TEXTOS.fotoHint,
              enviando: TEXTOS.fotoEnviando,
              enviada: TEXTOS.fotoEnviada,
              erroTipo: TEXTOS.erroFotoTipo,
              erroTamanho: TEXTOS.erroFotoTamanho,
            }}
          />
          <Etiqueta tom="info">{rotuloDoPapel(papelAdmin)}</Etiqueta>
        </div>

        <div className={estilos.par}>
          <Campo
            name="nome"
            rotulo={TEXTOS.rotuloNome}
            defaultValue={nome}
            required
            erro={erroDe('nome')}
          />
          <Campo
            name="cargo"
            rotulo={TEXTOS.rotuloCargo}
            placeholder={TEXTOS.placeholderCargo}
            defaultValue={cargo ?? ''}
            erro={erroDe('cargo')}
          />
        </div>

        <div className={estilos.linhaDoEmail}>
          {/* Sem `name`: campo sem nome não é enviado, e é exatamente o que se
              quer aqui — o e-mail troca pelo modal, com reautenticação, e um
              campo editável prometeria uma troca que este formulário não faz.
              (`form=""` faria o mesmo e é HTML inválido: o atributo tem de
              apontar para um `id` que existe.) */}
          <Campo type="email" rotulo={TEXTOS.rotuloEmail} value={email} readOnly />
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setModal('email')}>
            {CONTA.alterarEmail}
          </Botao>
        </div>

        <div className={estilos.blocoDaSenha}>
          <div className={estilos.textosDaSenha}>
            <span className={estilos.senhaTitulo}>{TEXTOS.senhaTitulo}</span>
            <span className={estilos.senhaNota}>{notaDaSenha}</span>
          </div>
          <Botao type="button" variante="secundario" tamanho="sm" onClick={() => setModal('senha')}>
            {CONTA.alterarSenha}
          </Botao>
        </div>

        {avisoDeCredencial === null ? null : <Aviso tom="sucesso">{avisoDeCredencial}</Aviso>}

        <div className={estilos.rodape}>
          <Botao type="submit" tamanho="denso" carregando={pendente} disabled={subindoFoto}>
            {pendente ? TEXTOS.salvando : TEXTOS.salvar}
          </Botao>
          {resultado !== null && resultado.ok ? <Aviso tom="sucesso">{TEXTOS.salvo}</Aviso> : null}
        </div>
      </form>

      <ModalDeCredencial
        tipo="senha"
        aberto={modal === 'senha'}
        onFechar={fechar}
        acao={acaoDeSenha}
        onSucesso={anunciar}
      />

      <ModalDeCredencial
        tipo="email"
        aberto={modal === 'email'}
        onFechar={fechar}
        acao={acaoDeEmail}
        onSucesso={anunciar}
      />
    </section>
  );
}
