import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { EstadoVazio } from '@dissona/nucleo/componentes/base/EstadoVazio';
import type { TomEtiqueta } from '@dissona/nucleo/componentes/base/Etiqueta';
import { iniciaisDe } from '@dissona/nucleo/lib/iniciais';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { Vitrine } from '@/modulos/artista/consultas';
import type { StatusNaVitrine } from '@/modulos/artista/servico';
import { ARTISTA_VITRINE as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import capaPadrao from '@dissona/nucleo/componentes/autenticacao/capas/f2.png';

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
  const meta = [perfil.handle === null ? null : `@${perfil.handle}`, perfil.cidade]
    .filter((parte) => parte !== null && parte !== '')
    .join(' · ');

  return (
    <div className={estilos.base}>
      <section className={estilos.cartao} aria-label={TEXTOS.titulo}>
        {/* Capa do protótipo aprovado: imagem, véu escuro e a faixa de cores. */}
        <div className={estilos.capa} style={{ backgroundImage: `url('${capaPadrao.src}')` }}>
          <span className={estilos.capaVeu} aria-hidden="true" />
          <span className={estilos.capaFaixa} aria-hidden="true" />
          <div className={estilos.capaAcoes}>
            <BotaoLink href={ROTA.ARTISTA_PERFIL_EDITAR} variante="secundario" tamanho="sm">
              {TEXTOS.editar}
            </BotaoLink>
          </div>
        </div>

        <div className={estilos.corpo}>
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
              <span className={estilos.papel}>Artista</span>
              <p className={estilos.nome}>{nome}</p>
              {meta === '' ? null : <p className={estilos.meta}>{meta}</p>}
            </div>
          </div>

          {perfil.generos.length > 0 ? (
            <ul className={estilos.generos}>
              {perfil.generos.map((genero) => (
                <li key={genero} className={estilos.genero}>
                  {genero}
                </li>
              ))}
            </ul>
          ) : null}

          <p className={perfil.bio === null || perfil.bio === '' ? estilos.bioVazia : estilos.bio}>
            {perfil.bio === null || perfil.bio === '' ? TEXTOS.bioVazia : perfil.bio}
          </p>
        </div>
      </section>

      <dl className={estilos.estatisticas}>
        <Estatistica
          valor={estatisticas.faixas}
          rotulo={TEXTOS.estatisticas.faixas}
          apoio={TEXTOS.estatisticas.faixasApoio}
          cor="roxo"
        />
        <Estatistica
          valor={estatisticas.leituras}
          rotulo={TEXTOS.estatisticas.leituras}
          apoio={TEXTOS.estatisticas.leiturasApoio}
          cor="violeta"
        />
        <Estatistica
          valor={estatisticas.indicacoes}
          rotulo={TEXTOS.estatisticas.indicacoes}
          apoio={TEXTOS.estatisticas.indicacoesApoio}
          cor="laranja"
        />
      </dl>

      <section className={estilos.lista} aria-labelledby="suas-faixas">
        <div className={estilos.listaCabecalho}>
          <h2 id="suas-faixas" className={estilos.listaTitulo}>
            {TEXTOS.suasFaixas}
          </h2>
          <span className={estilos.verTodas} aria-disabled="true" title={TEXTOS.verTodasPendente}>
            {TEXTOS.verTodas}
          </span>
        </div>
        {faixas.length === 0 ? (
          <div className={estilos.vazio}>
            <EstadoVazio
              titulo={TEXTOS.vazioTitulo}
              descricao={TEXTOS.vazioDescricao}
              acao={<BotaoLink href={ROTA.ARTISTA_ENVIAR}>{TEXTOS.vazioAcao}</BotaoLink>}
            />
          </div>
        ) : (
          <ul className={estilos.faixas}>
            {faixas.map((faixa) => (
              <li key={faixa.id} className={estilos.faixa}>
                <span className={estilos.faixaCapa} aria-hidden="true" />
                <span className={estilos.faixaTextos}>
                  <span className={estilos.faixaTitulo}>{faixa.titulo}</span>
                  <span className={estilos.faixaMeta}>{faixa.genero ?? '—'}</span>
                </span>
                <span
                  className={[
                    estilos.status,
                    tomDoStatus(faixa.status) === 'sucesso' ? estilos.statusLida : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {rotuloDoStatus(faixa.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Estatistica({
  valor,
  rotulo,
  apoio,
  cor,
}: {
  readonly valor: number;
  readonly rotulo: string;
  readonly apoio: string;
  readonly cor: 'roxo' | 'violeta' | 'laranja';
}) {
  return (
    <div className={estilos.estatistica} data-cor={cor}>
      <dt className={estilos.estatisticaRotulo}>
        {rotulo}
        <span className={estilos.estatisticaApoio}>{apoio}</span>
      </dt>
      <dd className={estilos.estatisticaValor}>{valor}</dd>
    </div>
  );
}
