import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BotaoLink } from '@/componentes/base/BotaoLink';
import { IniciarAvaliacao } from '@/componentes/curador/IniciarAvaliacao';
import { PlayerComMedicao } from '@/componentes/curador/avaliacao/PlayerComMedicao';
import { Etiqueta } from '@/componentes/base/Etiqueta';
import { Painel } from '@/componentes/base/Painel';
import * as claves from '@/lib/claves';
import { formatarData, tempoRelativo } from '@/lib/formato';
import { ROTA } from '@/lib/guarda-rota';
import { iniciarAvaliacaoDoEnvio } from '@/modulos/fila/acoes';
import { lerDetalhe } from '@/modulos/fila/consultas';
import { horasRestantes } from '@/modulos/fila/servico';
import { CARTEIRA, FILA as TEXTOS } from '@/textos/prototipo';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Detalhe do envio',
  robots: { index: false, follow: false },
};

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

  return (
    <div className={estilos.base}>
      <BotaoLink href={ROTA.CURADOR_FILA} variante="ghost" tamanho="sm">
        {TEXTOS.voltarParaFila}
      </BotaoLink>

      <Painel titulo={item.titulo} sublegenda={item.artista}>
        <dl className={estilos.dados}>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.colunas.genero}</dt>
            <dd className={estilos.valor}>{item.genero ?? '—'}</dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.rotuloDuracao}</dt>
            <dd className={estilos.valor}>{duracao(item.duracaoSegundos)}</dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.rotuloFaixa}</dt>
            <dd className={estilos.valor}>
              {TEXTOS.enviadaEm(tempoRelativo(item.enviadoEm, 'pt-BR', agora))}
            </dd>
          </div>
          <div>
            <dt className={estilos.rotulo}>{TEXTOS.rotuloStatus}</dt>
            <dd className={estilos.valor}>
              <Etiqueta tom={status === 'atrasada' ? 'erro' : 'info'}>
                {TEXTOS.filtros[status]}
              </Etiqueta>
            </dd>
          </div>
        </dl>
      </Painel>

      {/* RF-071 · a escuta acontece aqui, **antes** de "Iniciar avaliação".
          Entrar no wizard grava `avaliando`, e enquanto o player só existia lá
          dentro o estado `ouviu` nunca acendia — o nome do estado sempre disse
          que ele vem antes de assumir a avaliação. O componente é o mesmo da
          etapa 14; o que muda é onde ele é montado. */}
      <PlayerComMedicao
        envioId={item.envioId}
        src={audioUrl}
        titulo={item.titulo}
        artista={item.artista}
        minimoPercentual={escutaMinimaPercentual}
        escutaSalva={escutaSalva}
      />

      <Painel titulo={TEXTOS.oQueOArtistaQuerSaber} nivel={3}>
        <p className={item.contextoCurador === null ? estilos.vazio : estilos.contexto}>
          {item.contextoCurador ?? TEXTOS.semContexto}
        </p>
      </Painel>

      <Painel titulo={TEXTOS.prazoRestante} nivel={3}>
        <p className={atrasado ? estilos.prazoAtrasado : estilos.prazo}>
          {atrasado
            ? TEXTOS.prazoVencidoHoras(Math.floor(-horas))
            : horas < 24
              ? TEXTOS.prazoHoras(Math.floor(horas))
              : TEXTOS.prazoDias(Math.floor(horas / 24), Math.floor(horas % 24))}
        </p>
        <p className={estilos.nota}>
          {atrasado ? TEXTOS.notaAtrasado(diasAteDevolucao) : TEXTOS.notaNoPrazo}
        </p>
        <p className={estilos.nota}>{formatarData(item.prazoEm)}</p>
      </Painel>

      <Painel titulo={TEXTOS.rotuloServico} nivel={3}>
        <ul className={estilos.servicos}>
          {servicos.map((servico) => (
            <li key={servico.tipo} className={estilos.servico}>
              <span>{TEXTOS.servicos[servico.tipo]}</span>
              <span className={estilos.preco}>
                {claves.formatar(servico.precoClaves)} {CARTEIRA.saldoUnidade}
              </span>
            </li>
          ))}
        </ul>

        <p className={estilos.total}>
          {TEXTOS.totalDaLeitura}: {claves.formatar(total)} {CARTEIRA.saldoUnidade}
        </p>

        <IniciarAvaliacao envioId={item.envioId} acao={iniciarAvaliacaoDoEnvio} />
      </Painel>

      <p className={estilos.nota}>
        {TEXTOS.nota} · {prazoDeDevolucaoDias} dias
      </p>
    </div>
  );
}
