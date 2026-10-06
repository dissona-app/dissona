import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';

import estilos from '../DocumentoLegal.module.css';

export const metadata: Metadata = {
  title: 'Termos de uso — Dissona',
  description: 'Condições de uso da plataforma Dissona por artistas e curadores.',
  robots: { index: false, follow: false },
};

/**
 * Termos de uso.
 *
 * Mesma decisão da política de privacidade: a rota e a estrutura existem
 * desde a R0 porque o cadastro (R1) precisa linkar para cá no aceite, mas
 * **o texto é do jurídico do cliente**. Termos de uso definem obrigação
 * contratual, e um texto plausível escrito aqui seria pior que a ausência
 * dele — passaria por válido sem ninguém ter revisado.
 *
 * Os tópicos abaixo saem das regras de negócio já decididas
 * (docs/prd/01-regras-de-negocio.md): moeda interna, rateio, prazo de
 * avaliação, devolução automática e moderação.
 */
export default function Pagina() {
  return (
    <div className={estilos.pagina}>
      <article className={estilos.folha}>
        <Link className={estilos.voltar} href={ROTA.HOME}>
          ← Voltar
        </Link>

        <h1 className={estilos.titulo}>Termos de uso</h1>

        <Aviso tom="alerta" titulo="Documento pendente de redação" estatico>
          O conteúdo definitivo será fornecido pelo jurídico responsável. Os tópicos abaixo mapeiam
          as regras de negócio que os termos precisam cobrir.
        </Aviso>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>1. Objeto e partes</h2>
          <p className={estilos.corpo}>
            O que a plataforma é: intermediação entre artistas que submetem música e curadores que
            avaliam de forma remunerada. Papéis, e o fato de que artista e curador podem ser a mesma
            conta. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>2. Cadastro e elegibilidade</h2>
          <p className={estilos.corpo}>
            Requisitos de cadastro, veracidade das informações, idade mínima e o processo de
            aprovação para as classes de curador que dependem de análise. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>3. Claves e pagamentos</h2>
          <p className={estilos.corpo}>
            Natureza da moeda interna, condições de compra, ausência ou existência de validade,
            política de reembolso e as regras de devolução automática quando o curador não responde
            no prazo. Os valores e prazos vêm da configuração da plataforma. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>4. Remuneração do curador</h2>
          <p className={estilos.corpo}>
            Como a remuneração é composta por classe e por prazo, a retenção da plataforma, e as
            condições de saque. A base de cálculo por classe segue em definição. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>5. Propriedade intelectual</h2>
          <p className={estilos.corpo}>
            Titularidade das obras enviadas, licença concedida à plataforma para viabilizar a
            avaliação, e os limites do compartilhamento feito pelo curador. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>6. Conduta e moderação</h2>
          <p className={estilos.corpo}>
            Condutas vedadas, processo de denúncia e julgamento, penalidades aplicáveis e as
            hipóteses de bloqueio ou exclusão de conta. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>7. Limitação de responsabilidade</h2>
          <p className={estilos.corpo}>
            Limites da responsabilidade da plataforma quanto ao conteúdo das avaliações, ao
            resultado artístico e à disponibilidade do serviço. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>8. Alterações e foro</h2>
          <p className={estilos.corpo}>
            Como mudanças nos termos são comunicadas, prazo de vigência e legislação aplicável.
            Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>Tratamento de dados</h2>
          <p className={estilos.corpo}>
            O tratamento de dados pessoais está na{' '}
            <Link href={ROTA.PRIVACIDADE}>política de privacidade</Link>.
          </p>
        </section>
      </article>
    </div>
  );
}
