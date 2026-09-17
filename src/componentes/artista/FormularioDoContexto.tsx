'use client';

import { useActionState, useState } from 'react';

import { AreaTexto } from '@/componentes/base/AreaTexto';
import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Chips } from '@/componentes/base/Chips';
import { Painel } from '@/componentes/base/Painel';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { ROTA } from '@/lib/guarda-rota';
import type { FaixaEmEdicao } from '@/modulos/faixa/tipos';
import { erroGeralDe } from '@/textos/erros';
import { ENVIAR as TEXTOS, GENEROS_DO_ARTISTA } from '@/textos/prototipo';

import estilos from './FormularioDoContexto.module.css';

export type PropsFormularioDoContexto = {
  readonly faixa: FaixaEmEdicao;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

const MOTIVOS: Readonly<Record<string, string>> = {
  genero_invalido: TEXTOS.erroGeneroInvalido,
  contexto_vazio: TEXTOS.erroContextoVazio,
  contexto_longo: TEXTOS.erroContextoLongo,
};

/**
 * Passo 2 do envio — gênero e contexto.
 *
 * O gênero é **um só** (`faixa.genero` é `text`), então os chips têm
 * `maximo={1}`: escolher o segundo exigiria desmarcar o primeiro, o que a
 * própria prop já comunica ao desabilitar os demais.
 */
export function FormularioDoContexto({ faixa, acao }: PropsFormularioDoContexto) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const [contexto, setContexto] = useState(faixa.contextoCurador ?? '');

  const falha = resultado !== null && !resultado.ok ? resultado : null;
  const erroDe = (campo: string): string | undefined => {
    const motivo = falha?.campos?.[campo];
    return motivo === undefined ? undefined : MOTIVOS[motivo];
  };

  // Situação de faixa e autorização voltam sem campo — e o "Continuar" ficava
  // mudo. Ver `src/textos/erros.ts`.
  const erroGeral = erroGeralDe(falha, [erroDe('genero'), erroDe('contexto')]);

  return (
    <form action={enviar} className={estilos.base} noValidate>
      <input type="hidden" name="faixaId" value={faixa.id} />

      {erroGeral === undefined ? null : <Aviso tom="erro">{erroGeral}</Aviso>}

      <Painel titulo={TEXTOS.rotuloGenero}>
        <Chips
          name="genero"
          rotulo={TEXTOS.rotuloGenero}
          opcoes={GENEROS_DO_ARTISTA}
          selecionados={faixa.genero === null ? [] : [faixa.genero]}
          maximo={1}
          erro={erroDe('genero')}
        />
      </Painel>

      <Painel titulo={TEXTOS.rotuloContexto} sublegenda={TEXTOS.contextoApoio} nivel={3}>
        <AreaTexto
          name="contexto"
          rotulo={TEXTOS.rotuloContexto}
          variante="contexto"
          value={contexto}
          onChange={(evento) => setContexto(evento.target.value)}
          erro={erroDe('contexto')}
          required
        />
        <p className={estilos.contador}>{TEXTOS.contagemContexto(contexto.trim().length)}</p>
      </Painel>

      <div className={estilos.acoes}>
        <BotaoLink href={ROTA.ARTISTA_ENVIAR} variante="secundario">
          {TEXTOS.voltar}
        </BotaoLink>
        <Botao type="submit" carregando={pendente}>
          {TEXTOS.continuar}
        </Botao>
      </div>
    </form>
  );
}
