'use client';

import { Chips } from '@/componentes/base';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@/textos/curador';

import { AcoesDoPasso } from '../AcoesDoPasso';
import { usePasso } from '../usePasso';
import estilos from './Passos.module.css';
import type { PropsDoPasso } from './tipos';

const MOTIVOS: Readonly<Record<string, string>> = {
  genero_obrigatorio: CURADOR_CADASTRO.erroGenero,
};

/**
 * Passo 2 — gêneros.
 *
 * **Sem teto.** O contador do protótipo diz "Escolha quantos quiser", e o
 * `perfil_curador.generos` não tem `check` de tamanho — ao contrário de
 * `perfil_artista.generos`, que tem `array_length <= 3`. A diferença é
 * proposital nos dois lados: o artista se posiciona em até três gêneros, o
 * curador declara tudo o que escuta com propriedade.
 */
export function Passo2Generos({
  estado,
  passo,
  acao,
  acaoDeVoltar,
  acaoDePular,
}: PropsDoPasso & { readonly estado: EstadoDoCadastro }) {
  const { enviar, motivo } = usePasso(acao);

  return (
    <form action={enviar} className={estilos.formulario} noValidate>
      <Chips
        name="genero"
        opcoes={CURADOR_CADASTRO.generos}
        selecionados={estado.generos}
        rotulo={CURADOR_CADASTRO.titulos[1]}
        contador={CURADOR_CADASTRO.contagemGeneros}
        erro={motivo === undefined ? undefined : MOTIVOS[motivo]}
      />

      <AcoesDoPasso
        passo={passo}
        ultimo={false}
        podePular={false}
        acaoDeVoltar={acaoDeVoltar}
        acaoDePular={acaoDePular}
      />
    </form>
  );
}
