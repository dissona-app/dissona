import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import { Etiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import type { TomEtiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { Painel } from '@/componentes/base/Painel';
import { iniciaisDe } from '@dissona/nucleo/lib/iniciais';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { Vitrine } from '@/modulos/artista/consultas';
import type { StatusNaVitrine } from '@/modulos/artista/servico';
import { ARTISTA_VITRINE as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './VitrineDoPerfil.module.css';

/** O rótulo do status, com o plural que só "Lida por N" tem. */
function rotuloDoStatus(status: StatusNaVitrine): string {
  return status.chave === 'lida_por'
    ? TEXTOS.status.lida_por(status.quantos)
    : TEXTOS.status[status.chave];
}

/**
 * Verde quando houve leitura, neutro no resto.
 *
 * O protótipo pinta "Lida" de verde, "Lida por N" de roxo e "Em análise" de
 * cinza. `Etiqueta` não tem tom roxo, e inventar um só para esta tela
 * acrescentaria um tom ao Design System por causa de um caso — os dois estados
 * de leitura compartilham o verde, e o número já os distingue.
 */
function tomDoStatus(status: StatusNaVitrine): TomEtiqueta {
  return status.chave === 'lida' || status.chave === 'lida_por' ? 'sucesso' : 'neutro';
}

/**
 * 7.1 · Perfil — a vitrine em leitura.
 *
 * Server Component: não há nada interativo aqui além de dois links. O que a
 * tela mostra é o que os curadores veem antes de ouvir a pessoa, e é por isso
 * que ela vem **antes** do formulário no protótipo.
 *
 * "Ver todas" e a linha da faixa não navegam: o destino é o catálogo (módulo 6,
 * R4). O botão fica visível e desabilitado, com o motivo no `title`, no mesmo
 * padrão dos itens de release futura da sidebar — some-lo faria a tela mudar de
 * forma quando a R4 chegar.
 */
export function VitrineDoPerfil({
  vitrine,
  fotoUrl,
}: {
  readonly vitrine: Vitrine;
  readonly fotoUrl: string | null;
}) {
  const { perfil, estatisticas, faixas } = vitrine;
  const nome = perfil.nomeExibicao ?? perfil.nomeCompleto;

  return (
    <div className={estilos.base}>
      <Painel titulo={TEXTOS.titulo}>
        <div className={estilos.identidade}>
          {fotoUrl === null ? (
            <span className={estilos.avatar} aria-hidden="true">
              {iniciaisDe(nome)}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={estilos.avatarImagem} src={fotoUrl} alt="" />
          )}

          <div className={estilos.textos}>
            <p className={estilos.nome}>{nome}</p>
            <p className={estilos.meta}>
              {[perfil.handle === null ? null : `@${perfil.handle}`, perfil.cidade]
                .filter((parte) => parte !== null && parte !== '')
                .join(' · ')}
            </p>

            {perfil.generos.length > 0 ? (
              <ul className={estilos.generos}>
                {perfil.generos.map((genero) => (
                  <li key={genero}>
                    <Etiqueta tom="neutro">{genero}</Etiqueta>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <BotaoLink href={ROTA.ARTISTA_PERFIL_EDITAR} variante="secundario" tamanho="sm">
            {TEXTOS.editar}
          </BotaoLink>
        </div>

        <p className={perfil.bio === null || perfil.bio === '' ? estilos.bioVazia : estilos.bio}>
          {perfil.bio === null || perfil.bio === '' ? TEXTOS.bioVazia : perfil.bio}
        </p>
      </Painel>

      <dl className={estilos.estatisticas}>
        <Estatistica
          valor={estatisticas.faixas}
          rotulo={TEXTOS.estatisticas.faixas}
          apoio={TEXTOS.estatisticas.faixasApoio}
        />
        <Estatistica
          valor={estatisticas.leituras}
          rotulo={TEXTOS.estatisticas.leituras}
          apoio={TEXTOS.estatisticas.leiturasApoio}
        />
        <Estatistica
          valor={estatisticas.indicacoes}
          rotulo={TEXTOS.estatisticas.indicacoes}
          apoio={TEXTOS.estatisticas.indicacoesApoio}
        />
      </dl>

      <Painel
        titulo={TEXTOS.suasFaixas}
        acao={
          <span className={estilos.verTodas} aria-disabled="true" title={TEXTOS.verTodasPendente}>
            {TEXTOS.verTodas}
          </span>
        }
      >
        {faixas.length === 0 ? (
          <EstadoVazio
            titulo={TEXTOS.vazioTitulo}
            descricao={TEXTOS.vazioDescricao}
            acao={<BotaoLink href={ROTA.ARTISTA_ENVIAR}>{TEXTOS.vazioAcao}</BotaoLink>}
          />
        ) : (
          <ul className={estilos.faixas}>
            {faixas.map((faixa) => (
              <li key={faixa.id} className={estilos.faixa}>
                <span className={estilos.faixaTextos}>
                  <span className={estilos.faixaTitulo}>{faixa.titulo}</span>
                  <span className={estilos.faixaMeta}>{faixa.genero ?? '—'}</span>
                </span>
                <Etiqueta tom={tomDoStatus(faixa.status)}>{rotuloDoStatus(faixa.status)}</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
}

function Estatistica({
  valor,
  rotulo,
  apoio,
}: {
  readonly valor: number;
  readonly rotulo: string;
  readonly apoio: string;
}) {
  return (
    <div className={estilos.estatistica}>
      <dt className={estilos.estatisticaRotulo}>
        {rotulo}
        <span className={estilos.estatisticaApoio}>{apoio}</span>
      </dt>
      <dd className={estilos.estatisticaValor}>{valor}</dd>
    </div>
  );
}
