'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { CodigoErro } from '@/lib/erros';
import { ANEXO_MAX_BYTES, ANEXO_TIPOS } from '@/modulos/curador/esquemas';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CREDENCIAL_POR_ANEXO } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';
import { erroGeralDe } from '@/textos/erros';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { usePasso } from '../usePasso';
import { useUploadDireto } from '@/componentes/base/useUploadDireto';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  credencial_sem_prova: CURADOR_CADASTRO.erroCredencial,
};

/**
 * O anexo recusado não vem por motivo, vem por **código**.
 *
 * `concluir()` em `curador/acoes.ts` devolve `falha(FORMATO_NAO_SUPORTADO |
 * ARQUIVO_MUITO_GRANDE, 'arquivo')` — sem `detalhes`, que é de onde `usePasso`
 * tira `motivo`. Enquanto isto não existiu, `erroAnexoTipo` e
 * `erroAnexoTamanho` estavam escritos e eram inalcançáveis: PDF errado ou
 * arquivo grande demais não avançavam o passo e não diziam nada.
 */
const MENSAGEM_DO_ANEXO: Readonly<Partial<Record<CodigoErro, string>>> = {
  [CodigoErro.FORMATO_NAO_SUPORTADO]: CURADOR_CADASTRO.erroAnexoTipo,
  [CodigoErro.ARQUIVO_MUITO_GRANDE]: CURADOR_CADASTRO.erroAnexoTamanho,
};

/**
 * Passo 6 — credenciais. Pulável, e **é ele que decide a classe**.
 *
 * ## A dica de classe ao vivo
 *
 * O protótipo mostra "Com isso você seria Candidato a Prata" recalculado a cada
 * clique, e é a única coisa nesta tela que exige estado no cliente. Ela vale o
 * custo: sem ela a pessoa marca as caixas às cegas e só descobre a classe na
 * tela seguinte, quando já não pode mudar.
 *
 * A contagem aqui é otimista — conta caixa marcada com link **preenchido**, não
 * com link válido. A conta que vale é a do banco, sobre `verificavel`, e é ela
 * que a tela 12.4 mostra. Divergir para mais na dica é melhor que para menos:
 * quem vê "seria Prata" e recebe Bronze tem o motivo explicado na 12.4; quem vê
 * "seria Bronze" e teria sido Prata não teria por que insistir.
 *
 * O mínimo vem de `configuracao.classe.prata_min_credenciais`, carregado pelo
 * servidor e passado em `estado` — nunca uma constante daqui.
 */
export function Passo6Credenciais({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo, falha } = usePasso(acao);

  const anexo = useUploadDireto({
    balde: 'materiais',
    nomeBase: 'formacao',
    tipos: ANEXO_TIPOS,
    maxBytes: ANEXO_MAX_BYTES,
    mensagens: {
      tipo: CURADOR_CADASTRO.erroAnexoTipo,
      tamanho: CURADOR_CADASTRO.erroAnexoTamanho,
    },
  });

  const salva = (tipo: string) => estado.credenciais.find((cada) => cada.tipo === tipo);
  const anexoGravado = salva(CREDENCIAL_POR_ANEXO)?.anexoCaminho ?? null;

  const [marcadas, setMarcadas] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries(
      CURADOR_CADASTRO.credenciais.map((credencial) => [
        credencial.valor,
        salva(credencial.valor) !== undefined,
      ]),
    ),
  );
  const [links, setLinks] = useState<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(
      CURADOR_CADASTRO.credenciais.map((credencial) => [
        credencial.valor,
        salva(credencial.valor)?.url ?? '',
      ]),
    ),
  );

  const comprovadas = CURADOR_CADASTRO.credenciais.filter((credencial) => {
    if (marcadas[credencial.valor] !== true) return false;
    if (credencial.valor === CREDENCIAL_POR_ANEXO) {
      return anexo.caminho !== '' || anexo.nome !== null || anexoGravado !== null;
    }
    return (links[credencial.valor] ?? '').trim() !== '';
  }).length;

  const candidato = comprovadas >= estado.minimoParaPrata;
  const erro =
    (falha === null ? undefined : MENSAGEM_DO_ANEXO[falha.codigo]) ??
    (motivo === undefined ? undefined : MOTIVOS[motivo]);
  // `anexo.erro` entra na lista de pintados: sem isso a pessoa veria a mensagem
  // do upload **e** o aviso geral, dizendo duas coisas para um evento só.
  const erroGeral = erroGeralDe(falha, [erro, anexo.erro]);
  const aviso = anexo.erro ?? erro ?? erroGeral;

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      {aviso !== undefined ? (
        <Aviso tom="erro" titulo={aviso}>
          {CURADOR_CADASTRO.subtitulos[5]}
        </Aviso>
      ) : null}

      {/* O anexo já gravado viaja num campo escondido: sem ele, o servidor não
          saberia distinguir "não anexou" de "anexou antes e não trocou". */}
      {anexoGravado === null ? null : (
        <input type="hidden" name="anexo_formacao_existente" value="1" />
      )}

      {/* O caminho do que subiu agora. A ação o prefere ao que já estava
          gravado, e é ele que faz `temAnexoNovo` enxergar o upload direto. */}
      <input type="hidden" name="anexo_formacao_caminho" value={anexo.caminho} />

      <ul className={estilos.cartoes}>
        {CURADOR_CADASTRO.credenciais.map((credencial) => {
          const marcada = marcadas[credencial.valor] === true;
          const porAnexo = credencial.valor === CREDENCIAL_POR_ANEXO;

          return (
            <li key={credencial.valor} className={marcada ? estilos.cartaoAtivo : estilos.cartao}>
              <label className={estilos.cartaoRotulo}>
                <input
                  type="checkbox"
                  name={`credencial_${credencial.valor}`}
                  className={estilos.caixaEscondida}
                  defaultChecked={marcada}
                  onChange={(evento) =>
                    setMarcadas((atuais) => ({
                      ...atuais,
                      [credencial.valor]: evento.target.checked,
                    }))
                  }
                />
                <span className={estilos.caixa} aria-hidden="true">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    focusable="false"
                  >
                    <path d="m5 13 4.5 4.5L19 7" />
                  </svg>
                </span>
                <span className={estilos.credencialRotulo}>{credencial.rotulo}</span>
              </label>

              {/* A prova só aparece quando a caixa está marcada — é o que o
                  protótipo faz, e é o que evita seis campos vazios na tela. */}
              {marcada ? (
                porAnexo ? (
                  <label className={estilos.anexo}>
                    <span className={estilos.anexoBotao}>{CURADOR_CADASTRO.anexarComprovacao}</span>
                    {/* O `name` fica: sem JavaScript o `onChange` não roda, e o
                        arquivo volta a viajar no `multipart` para `salvarPasso6`
                        validar. */}
                    <input
                      type="file"
                      name="anexo_formacao"
                      accept="application/pdf,image/jpeg,image/png"
                      className={estilos.arquivo}
                      onChange={anexo.aoEscolher}
                    />
                    <span className={estilos.anexoNome} aria-live="polite">
                      {anexo.subindo
                        ? CURADOR_CADASTRO.anexoEnviando
                        : (anexo.nome ??
                          (anexoGravado === null
                            ? credencial.dica
                            : CURADOR_CADASTRO.anexoEnviado))}
                    </span>
                  </label>
                ) : (
                  <input
                    type="text"
                    name={`link_${credencial.valor}`}
                    className={estilos.linkEntrada}
                    placeholder={credencial.dica}
                    defaultValue={links[credencial.valor] ?? ''}
                    inputMode="url"
                    aria-label={`${credencial.rotulo}: ${credencial.dica}`}
                    onChange={(evento) =>
                      setLinks((atuais) => ({
                        ...atuais,
                        [credencial.valor]: evento.target.value,
                      }))
                    }
                  />
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* `role="status"`: o texto muda a cada clique, e sem isso quem usa
          leitor de tela marca as seis caixas sem saber que existe uma dica. */}
      <p className={estilos.dica} role="status">
        <strong className={candidato ? estilos.dicaPrata : estilos.dicaBronze}>
          {CURADOR_CADASTRO.dicaClasse(candidato)}
        </strong>
        <span className={estilos.dicaContagem}>
          {CURADOR_CADASTRO.dicaContagem(comprovadas, estado.minimoParaPrata)}
        </span>
      </p>

      <AcoesDoPasso
        ocupado={anexo.subindo}
        passo={passo}
        ultimo={false}
        podePular
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
