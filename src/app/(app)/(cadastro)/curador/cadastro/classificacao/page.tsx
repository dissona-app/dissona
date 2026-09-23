import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BotaoLink } from '@/componentes/base/BotaoLink';
import { MolduraDaClasse } from '@/componentes/curador/MolduraDaClasse';
import { ROTA } from '@/lib/guarda-rota';
import { lerCadastroDoCurador } from '@/modulos/curador/consultas';
import { credenciaisComprovadas, seriaCandidatoAPrata } from '@/modulos/curador/tipos';
import { CURADOR_CADASTRO, CURADOR_CLASSIFICACAO } from '@/textos/curador';

import estilos from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Sua classe · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Tela 12.4 — classificação.
 *
 * Ela **não classifica**: a classificação já aconteceu, dentro de
 * `concluir_cadastro_curador`, junto das notificações e numa transação só. Esta
 * tela lê o resultado e o explica.
 *
 * A separação importa porque a tela é recarregável e alcançável pelo histórico.
 * Se ela classificasse, um F5 tentaria reclassificar — e o `old.situacao =
 * 'rascunho'` da janela da `0002c` recusaria, com um erro que a pessoa não
 * causou.
 *
 * A contagem exibida vem de `verificavel`, a mesma coluna que a RPC contou —
 * não de uma segunda conta feita aqui.
 */
export default async function Pagina() {
  const estado = await lerCadastroDoCurador();
  if (estado === null) redirect(ROTA.CURADOR_ENTRAR);

  // Chegou aqui sem ter enviado: o lugar dele é o wizard.
  if (!estado.concluido) redirect(ROTA.CURADOR_CADASTRO);

  const comprovadas = credenciaisComprovadas(estado);
  const candidato = seriaCandidatoAPrata(estado);
  const minimo = estado.minimoParaPrata;

  return (
    <MolduraDaClasse
      selo={candidato ? CURADOR_CLASSIFICACAO.tituloPrata : CURADOR_CLASSIFICACAO.tituloBronze}
      titulo={candidato ? CURADOR_CLASSIFICACAO.tituloPrata : CURADOR_CLASSIFICACAO.tituloBronze}
      subtitulo={
        candidato ? CURADOR_CLASSIFICACAO.subPrata(minimo) : CURADOR_CLASSIFICACAO.subBronze
      }
      texto={
        candidato
          ? CURADOR_CLASSIFICACAO.descPrata(minimo)
          : CURADOR_CLASSIFICACAO.descBronze(minimo)
      }
      tom={candidato ? 'prata' : 'bronze'}
    >
      <div className={estilos.painel}>
        <div className={estilos.painelCabecalho}>
          <span className={estilos.painelTitulo}>{CURADOR_CLASSIFICACAO.painelCredenciais}</span>
          <span className={candidato ? estilos.contagemOk : estilos.contagemFalta}>
            {CURADOR_CLASSIFICACAO.contagem(comprovadas, minimo)}
          </span>
        </div>

        <ul className={estilos.credenciais}>
          {CURADOR_CADASTRO.credenciais.map((credencial) => {
            const salva = estado.credenciais.find((cada) => cada.tipo === credencial.valor);
            const comprovada = salva?.verificavel === true;

            return (
              <li
                key={credencial.valor}
                className={comprovada ? estilos.credencialOk : estilos.credencial}
              >
                <span className={estilos.dot} aria-hidden="true" />
                {credencial.rotulo}
                {/* A cor não pode ser o único portador da informação (§4.2). */}
                <span className="dsn-apenas-leitor">
                  {comprovada ? ' (comprovada)' : ' (não comprovada)'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className={estilos.notaOuro}>{CURADOR_CLASSIFICACAO.notaOuro}</p>

      <BotaoLink
        href={candidato ? ROTA.CURADOR_CADASTRO_ANALISE : `${ROTA.CURADOR_CADASTRO}/bronze`}
        tamanho="denso"
        blocoInteiro
      >
        {CURADOR_CLASSIFICACAO.continuar}
      </BotaoLink>
    </MolduraDaClasse>
  );
}
