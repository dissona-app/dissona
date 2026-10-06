import { BotaoLink } from '@/componentes/base/BotaoLink';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { Painel } from '@/componentes/base/Painel';
import { SeloClasse } from '@/componentes/base/SeloClasse';
import { ROTA } from '@/lib/guarda-rota';
import type { EstadoDoCadastro } from '@/modulos/curador/tipos';
import { CURADOR_PERFIL as TEXTOS } from '@/textos/conta';
import { CURADOR_CADASTRO } from '@/textos/curador';

import estilos from './PerfilDoCurador.module.css';

export type PropsPerfilDoCurador = {
  readonly estado: EstadoDoCadastro;
};

/** Rótulo humano de um tipo de credencial, do catálogo do passo 6. */
function rotuloDaCredencial(tipo: string): string {
  return CURADOR_CADASTRO.credenciais.find((cada) => cada.valor === tipo)?.rotulo ?? tipo;
}

/**
 * 17.1 · Perfil do curador — **leitura**.
 *
 * Server Component: não há estado nem interação, só um link para 12.6.
 *
 * A classe e as credenciais são somente leitura por regra do PRD §17.1, e isso
 * não é só uma decisão de tela: o trigger `proibir_autopromocao_de_classe` da
 * `0002c` recusa a escrita do próprio curador, e o único caminho é a RPC
 * `concluir_cadastro_curador`. A tela apenas conta a verdade que o banco já
 * impõe.
 */
export function PerfilDoCurador({ estado }: PropsPerfilDoCurador) {
  return (
    <div className={estilos.base}>
      <Painel titulo={TEXTOS.titulo} sublegenda={TEXTOS.subtitulo}>
        <div className={estilos.classe}>
          <div>
            <h3 className={estilos.rotulo}>{TEXTOS.classeTitulo}</h3>
            <SeloClasse classe={estado.classe} />
          </div>
          <p className={estilos.nota}>{TEXTOS.classeNota}</p>
        </div>

        <section className={estilos.bloco}>
          <h3 className={estilos.rotulo}>{TEXTOS.bioTitulo}</h3>
          <p className={estado.bio === null ? estilos.vazio : estilos.texto}>
            {estado.bio ?? TEXTOS.bioVazia}
          </p>
        </section>

        <section className={estilos.bloco}>
          <h3 className={estilos.rotulo}>{TEXTOS.generosTitulo}</h3>
          {estado.generos.length === 0 ? (
            <p className={estilos.vazio}>{TEXTOS.generosVazios}</p>
          ) : (
            <ul className={estilos.etiquetas}>
              {estado.generos.map((genero) => (
                <li key={genero}>
                  <Etiqueta tom="info">{genero}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={estilos.bloco}>
          <h3 className={estilos.rotulo}>{TEXTOS.especialidadeTitulo}</h3>
          <p className={estado.especialidade === null ? estilos.vazio : estilos.texto}>
            {estado.especialidade ?? TEXTOS.especialidadeVazia}
          </p>
        </section>
      </Painel>

      <Painel titulo={TEXTOS.credenciaisTitulo} sublegenda={TEXTOS.credenciaisNota} nivel={3}>
        {estado.credenciais.length === 0 ? (
          <p className={estilos.vazio}>{TEXTOS.credenciaisVazias}</p>
        ) : (
          <ul className={estilos.credenciais}>
            {estado.credenciais.map((credencial) => (
              <li key={credencial.tipo} className={estilos.credencial}>
                <span className={estilos.texto}>{rotuloDaCredencial(credencial.tipo)}</span>
                {credencial.verificavel ? (
                  <Etiqueta tom="sucesso" dot="sucesso">
                    {TEXTOS.credencialComprovada}
                  </Etiqueta>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Painel>

      <div className={estilos.acoes}>
        <BotaoLink href={ROTA.CURADOR_MEU_CADASTRO} variante="secundario">
          {TEXTOS.editar}
        </BotaoLink>
        <span className={estilos.nota}>{TEXTOS.editarNota}</span>
      </div>
    </div>
  );
}
