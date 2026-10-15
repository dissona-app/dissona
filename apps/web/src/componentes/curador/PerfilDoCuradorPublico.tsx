import Link from 'next/link';

import * as dinheiro from '@dissona/nucleo/lib/dinheiro';
import { iniciaisDe } from '@dissona/nucleo/lib/iniciais';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type {
  CanalDoCurador,
  ClasseCurador,
  ServicoDoCurador,
  TipoDeMidia,
  TipoDeServico,
} from '@dissona/nucleo/modulos/curador/tipos';
import { CURADOR_CADASTRO } from '@dissona/nucleo/textos/curador';
import type { VitrineDoCuradorCompleta } from '@/modulos/curador/consultas';

import estilos from './PerfilDoCuradorPublico.module.css';

const ROTULO_DA_CLASSE: Record<ClasseCurador, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

export type PropsPerfilDoCuradorPublico = {
  readonly nome: string;
  readonly fotoUrl: string | null;
  readonly classe: ClasseCurador;
  readonly generos: readonly string[];
  readonly bio: string | null;
  readonly canais: readonly CanalDoCurador[];
  readonly servicos: readonly ServicoDoCurador[];
  /** Valor de uma Clave em centavos (`configuracao`). */
  readonly valorDaClave: bigint;
  readonly vitrine: VitrineDoCuradorCompleta;
};

/**
 * "Meu perfil" do curador — protótipo aprovado: a vitrine que o artista vê
 * antes de escolher quem ouve a faixa. Capa escura com o avatar, nome e
 * classe; quatro números; e três colunas — serviços, canais e leituras.
 *
 * A edição fica em "Editar perfil" (`/curador/meu-cadastro/editar`). "Nota dos
 * artistas" mostra "—": a avaliação do artista sobre a devolutiva é de outra
 * release, e um número inventado seria pior que nenhum.
 */
export function PerfilDoCuradorPublico({
  nome,
  fotoUrl,
  classe,
  generos,
  bio,
  canais,
  servicos,
  valorDaClave,
  vitrine,
}: PropsPerfilDoCuradorPublico) {
  const desde = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(new Date(vitrine.desde))
    .replace('.', '')
    .replace(' de ', ' ');
  const linha = [
    vitrine.handle === null ? null : `@${vitrine.handle}`,
    vitrine.cidade,
    `Curador desde ${desde}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const percentual =
    vitrine.curadorias === 0 ? '—' : `${Math.round((vitrine.noPrazo / vitrine.curadorias) * 100)}%`;
  const ativos = servicos.filter((servico) => servico.ativo);
  const umaClave = dinheiro.formatar(valorDaClave).replace(/,00$/, '');

  return (
    <div className={estilos.base}>
      <section className={estilos.cartao} aria-label={nome}>
        <div className={estilos.capa}>
          <span className={estilos.veu} aria-hidden="true" />
          <div className={estilos.acoesDaCapa}>
            <span
              className={estilos.verComoArtista}
              aria-disabled="true"
              title="A vitrine pública do curador chega com a lista de curadores do artista."
            >
              Ver como artista
            </span>
            <Link className={estilos.editar} href={`${ROTA.CURADOR_MEU_CADASTRO}/editar`}>
              Editar perfil
            </Link>
          </div>
        </div>

        <div className={estilos.identidade}>
          {fotoUrl === null ? (
            <span className={estilos.avatar} aria-hidden="true">
              {iniciaisDe(nome)}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={estilos.avatar} src={fotoUrl} alt="" />
          )}
          <div className={estilos.quem}>
            <span className={estilos.linhaDoNome}>
              <span className={estilos.nome}>{nome}</span>
              <span className={estilos.classe} data-classe={classe}>
                {ROTULO_DA_CLASSE[classe]}
              </span>
            </span>
            <span className={estilos.apoio}>{linha}</span>
          </div>
          {generos.length > 0 ? (
            <ul className={estilos.generos}>
              {generos.map((genero) => (
                <li key={genero}>{genero}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {bio !== null && bio !== '' ? <p className={estilos.bio}>{bio}</p> : null}
      </section>

      <dl className={estilos.numeros}>
        <Numero rotulo="Curadorias" valor={String(vitrine.curadorias)} apoio="Leituras entregues" />
        <Numero rotulo="Nota dos artistas" valor="— / 5" apoio="Média das avaliações" />
        <Numero
          rotulo="Entrega em 72h"
          valor={percentual}
          apoio={`${vitrine.noPrazo} de ${vitrine.curadorias} no prazo`}
        />
        <Numero
          rotulo="Compartilhamentos"
          valor={String(vitrine.compartilhamentos)}
          apoio="Faixas levadas adiante"
        />
      </dl>

      <div className={estilos.colunas}>
        <section className={estilos.coluna} aria-labelledby="servicos-e-precos">
          <div className={estilos.cabecalhoDaColuna}>
            <h2 id="servicos-e-precos" className={estilos.overline}>
              Serviços e preços
            </h2>
            <span className={estilos.apoioDoCabecalho}>1 Clave = {umaClave}</span>
          </div>
          <ul className={estilos.servicos}>
            {ativos.map((servico) => {
              const texto = CURADOR_CADASTRO.servicos.find((cada) => cada.valor === servico.tipo);
              return (
                <li key={servico.tipo} className={estilos.servico}>
                  <span className={estilos.iconeServico} aria-hidden="true">
                    <IconeDeServico tipo={servico.tipo} />
                  </span>
                  <span className={estilos.textosServico}>
                    <span className={estilos.tituloServico}>
                      {(texto?.rotulo ?? servico.tipo).replace(' · obrigatório', '')}
                    </span>
                    <span className={estilos.descricao}>{texto?.descricao}</span>
                  </span>
                  <span className={estilos.preco}>
                    <span className={estilos.precoClaves}>
                      {servico.precoClaves} {servico.precoClaves === 1 ? 'Clave' : 'Claves'}
                    </span>
                    <span className={estilos.precoReais}>
                      {dinheiro
                        .formatar(valorDaClave * BigInt(servico.precoClaves))
                        .replace(/,00$/, '')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={estilos.coluna} aria-labelledby="canais-de-curadoria">
          <div className={estilos.cabecalhoDaColuna}>
            <h2 id="canais-de-curadoria" className={estilos.overline}>
              Canais de curadoria
            </h2>
          </div>
          {canais.length === 0 ? (
            <p className={estilos.vazio}>Nenhum canal cadastrado ainda.</p>
          ) : (
            <ul className={estilos.canais}>
              {canais.map((canal) => {
                const salvamentos = vitrine.salvamentosPorCanal.get(canal.id);
                return (
                  <li key={canal.id} className={estilos.canal}>
                    <span className={estilos.iconeCanal} aria-hidden="true">
                      <IconeDeCanal tipo={canal.tipo} />
                    </span>
                    <span className={estilos.textosServico}>
                      <span className={estilos.tituloServico}>{canal.nome}</span>
                      <span className={estilos.descricao}>
                        {canal.url.replace(/^https?:\/\//, '')}
                      </span>
                    </span>
                    {salvamentos === undefined ? null : (
                      <span className={estilos.seguidores}>
                        {new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(
                          salvamentos,
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={estilos.coluna} aria-labelledby="leituras-recentes">
          <div className={estilos.cabecalhoDaColuna}>
            <h2 id="leituras-recentes" className={estilos.overline}>
              Leituras recentes
            </h2>
            <Link className={estilos.verTodas} href={ROTA.CURADOR_AVALIAR}>
              Ver todas
            </Link>
          </div>
          {vitrine.leituras.length === 0 ? (
            <p className={estilos.vazio}>Suas leituras entregues aparecem aqui.</p>
          ) : (
            <ul className={estilos.leituras}>
              {vitrine.leituras.map((leitura) => (
                <li key={leitura.id} className={estilos.leitura}>
                  <span className={estilos.linhaDaLeitura}>
                    <span className={estilos.tituloServico}>{leitura.faixa}</span>
                    {leitura.artista === null ? null : (
                      <span className={estilos.artista}> · {leitura.artista}</span>
                    )}
                    {leitura.nota === null ? null : (
                      <span className={estilos.nota}>
                        {leitura.nota.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    )}
                  </span>
                  {leitura.trecho === null ? null : (
                    <span className={estilos.trecho}>{leitura.trecho}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  apoio,
}: {
  readonly rotulo: string;
  readonly valor: string;
  readonly apoio: string;
}) {
  return (
    <div className={estilos.numero}>
      <dt className={estilos.numeroRotulo}>{rotulo}</dt>
      <dd className={estilos.numeroValor}>{valor}</dd>
      <dd className={estilos.numeroApoio}>{apoio}</dd>
    </div>
  );
}

function Svg({ children, cor }: { readonly children: React.ReactNode; readonly cor: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function IconeDeServico({ tipo }: { readonly tipo: TipoDeServico }) {
  const cor = '#a93a22';
  if (tipo === 'feedback')
    return (
      <Svg cor={cor}>
        <path d="M5 4h14v12H9l-4 4z M8.5 8.5h7 M8.5 11.5h4.5" />
      </Svg>
    );
  if (tipo === 'playlist')
    return (
      <Svg cor={cor}>
        <path d="M4 6h11M4 11h11M4 16h7M17 17.5V7l3-1" />
      </Svg>
    );
  return (
    <Svg cor={cor}>
      <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3z M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z" />
    </Svg>
  );
}

function IconeDeCanal({ tipo }: { readonly tipo: TipoDeMidia }) {
  const cor = '#7f47dd';
  if (tipo === 'instagram')
    return (
      <Svg cor={cor}>
        <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3z M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z M17.3 6.7h.01" />
      </Svg>
    );
  if (tipo === 'playlist')
    return (
      <Svg cor={cor}>
        <path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M7.5 9.6c3-1 6.4-.8 9.1.8 M8 12.7c2.5-.7 5.1-.5 7.3.8 M8.6 15.5c1.9-.4 3.8-.3 5.5.6" />
      </Svg>
    );
  return (
    <Svg cor={cor}>
      <path d="M4 6h11M4 11h11M4 16h7M17 17.5V7l3-1" />
    </Svg>
  );
}
