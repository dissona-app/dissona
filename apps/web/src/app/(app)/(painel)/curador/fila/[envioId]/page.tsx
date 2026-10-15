import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BotaoLink } from '@dissona/nucleo/componentes/base/BotaoLink';
import { capaDoEnvio } from '@/componentes/curador/capas';
import { IniciarAvaliacao } from '@/componentes/curador/IniciarAvaliacao';
import { PlayerComMedicao } from '@/componentes/curador/avaliacao/PlayerComMedicao';
import * as claves from '@dissona/nucleo/lib/claves';
import { formatarData, tempoRelativo } from '@dissona/nucleo/lib/formato';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { iniciarAvaliacaoDoEnvio } from '@/modulos/fila/acoes';
import { lerDetalhe } from '@/modulos/fila/consultas';
import { horasRestantes } from '@/modulos/fila/servico';
import { CURADOR_CADASTRO } from '@dissona/nucleo/textos/curador';
import { CARTEIRA, FILA as TEXTOS } from '@dissona/nucleo/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Detalhe do envio',
  robots: { index: false, follow: false },
};

/** A descrição do serviço, a mesma do passo 5 do cadastro do curador. */
function descricaoDoServico(tipo: string): string | undefined {
  return CURADOR_CADASTRO.servicos.find((servico) => servico.valor === tipo)?.descricao;
}

/** Duração em `m:ss`, que é como o protótipo a mostra. */
function duracao(segundos: number | null): string {
  if (segundos === null) return '—';
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

/**
 * 13.1 · Detalhe do item da fila.
 *
 * Os serviços vêm de `servico_envio`, com o preço **congelado** no momento da
 * seleção — e não de `servico_curador`, que o curador pode ter mudado depois.
 * O total da leitura é a soma deles, que é exatamente o que foi debitado do
 * artista.
 */
export default async function PaginaDoDetalhe({
  params,
}: {
  readonly params: Promise<{ readonly envioId: string }>;
}) {
  const { envioId } = await params;

  const detalhe = await lerDetalhe(envioId);
  // `null` também cobre "o envio é de outro curador": a view o esconde, e
  // distinguir os dois casos revelaria que ele existe.
  if (detalhe === null) notFound();

  const {
    item,
    servicos,
    status,
    prazoDeDevolucaoDias,
    audioUrl,
    escutaMinimaPercentual,
    escutaSalva,
    agora,
  } = detalhe;
  const horas = horasRestantes(item, agora);
  const atrasado = horas < 0;

  const total = claves.somar(...servicos.map((servico) => servico.precoClaves));

  // "Em N dias sem resposta a Clave volta" — o que sobra dos 7 dias.
  const diasAteDevolucao = Math.max(
    0,
    Math.ceil((item.devolucaoEm.getTime() - agora.getTime()) / 86_400_000),
  );

  // Protótipo aprovado (13.1): um cartão com a capa desfocada ao fundo; à
  // esquerda a capa, a faixa e o player; à direita o que o artista quer
  // saber, o prazo e o serviço, e o botão de começar.
  const capa = capaDoEnvio(item.envioId);
  return (
    <div className={estilos.base}>
      <BotaoLink href={ROTA.CURADOR_FILA} variante="ghost" tamanho="sm">
        <span aria-hidden="true">‹</span> {TEXTOS.voltarParaFila}
      </BotaoLink>

      <section className={estilos.cartao} aria-labelledby="titulo-da-faixa">
        <span
          className={estilos.fundo}
          style={{ backgroundImage: `url('${capa}')` }}
          aria-hidden="true"
        />
        <span className={estilos.veu} aria-hidden="true" />

        <div className={estilos.grade}>
          <div className={estilos.esquerda}>
            <div className={estilos.capa} style={{ backgroundImage: `url('${capa}')` }}>
              <span className={estilos.status} data-status={status}>
                {TEXTOS.filtros[status]}
              </span>
            </div>

            <div className={estilos.identidade}>
              <div className={estilos.identidadeTextos}>
                <h2 id="titulo-da-faixa" className={estilos.titulo}>
                  {item.titulo}
                </h2>
                <span className={estilos.artista}>
                  {item.artista} · {item.genero ?? '—'}
                </span>
              </div>
              <span className={estilos.info}>
                {duracao(item.duracaoSegundos)} · {tempoRelativo(item.enviadoEm, 'pt-BR', agora)}
              </span>
            </div>

            {/* O player mede a escuta e carimba `ouviu` — ver 13.1. */}
            <PlayerComMedicao
              envioId={item.envioId}
              src={audioUrl}
              titulo={item.titulo}
              artista={item.artista}
              minimoPercentual={escutaMinimaPercentual}
              escutaSalva={escutaSalva}
            />
          </div>

          <div className={estilos.direita}>
            <div className={estilos.bloco}>
              <h3 className={estilos.rotulo}>{TEXTOS.oQueOArtistaQuerSaber}</h3>
              <p className={item.contextoCurador === null ? estilos.vazio : estilos.contexto}>
                {item.contextoCurador ?? TEXTOS.semContexto}
              </p>
              <span className={estilos.nota}>
                {TEXTOS.rotuloEnviada} {tempoRelativo(item.enviadoEm, 'pt-BR', agora)} ·{' '}
                {item.artista}
              </span>
            </div>

            <div className={estilos.cartoes}>
              <div
                className={[estilos.mini, atrasado ? estilos.miniAtrasado : undefined]
                  .filter(Boolean)
                  .join(' ')}
              >
                <h3 className={estilos.rotulo}>{TEXTOS.prazoRestante}</h3>
                <p className={atrasado ? estilos.prazoAtrasado : estilos.prazo}>
                  {atrasado
                    ? TEXTOS.prazoVencidoHoras(Math.floor(-horas))
                    : horas < 24
                      ? TEXTOS.prazoHoras(Math.floor(horas))
                      : TEXTOS.prazoDias(Math.floor(horas / 24), Math.floor(horas % 24))}
                  {atrasado ? null : ' restantes'}
                </p>
                <span className={estilos.barra}>
                  <span
                    className={estilos.barraValor}
                    style={{
                      width: `${atrasado ? 100 : Math.max(4, Math.min(100, Math.round(((72 - horas) / 72) * 100)))}%`,
                    }}
                  />
                </span>
                {atrasado ? (
                  <p className={estilos.nota}>{TEXTOS.notaAtrasado(diasAteDevolucao)}</p>
                ) : null}
              </div>

              <div className={estilos.mini}>
                <div className={estilos.miniTopo}>
                  <h3 className={estilos.rotulo}>{TEXTOS.rotuloServico}</h3>
                  <span className={estilos.total}>
                    <span className="dsn-apenas-leitor">{TEXTOS.totalDaLeitura}: </span>
                    {claves.formatar(total)} {CARTEIRA.saldoUnidade}
                  </span>
                </div>
                <ul className={estilos.servicos}>
                  {servicos.map((servico) => (
                    <li key={servico.tipo} className={estilos.servico}>
                      <span className={estilos.servicoNome}>
                        {TEXTOS.servicos[servico.tipo]}
                        {descricaoDoServico(servico.tipo) !== undefined ? (
                          <span className={estilos.servicoDescricao}>
                            {descricaoDoServico(servico.tipo)}
                          </span>
                        ) : null}
                      </span>
                      <span className={estilos.preco}>
                        {claves.formatar(servico.precoClaves)} {CARTEIRA.saldoUnidade}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <IniciarAvaliacao envioId={item.envioId} acao={iniciarAvaliacaoDoEnvio} />
          </div>
        </div>
      </section>
    </div>
  );
}
