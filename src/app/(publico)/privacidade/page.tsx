import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@/componentes/base/Aviso';
import { ROTA } from '@/lib/guarda-rota';

import estilos from '../DocumentoLegal.module.css';

export const metadata: Metadata = {
  title: 'Política de privacidade — Dissona',
  description: 'Como a Dissona trata os dados pessoais de artistas e curadores.',
  // Documento sem texto final não deve ser indexado.
  robots: { index: false, follow: false },
};

/**
 * Política de privacidade.
 *
 * A rota, o layout e as seções exigidas pela LGPD existem desde a R0 porque o
 * cadastro (R1) precisa linkar para cá no aceite. **O texto é do jurídico do
 * cliente** — política de privacidade é documento vinculante, e um texto
 * plausível gerado aqui seria pior que a ausência dele: passaria por válido.
 *
 * As seções abaixo saem do que a LGPD exige (art. 9º e art. 18) e do que a
 * doc já decidiu sobre tratamento de dados: exportação em `.zip`
 * (`exportacoes`), exclusão de conta em 2 passos e expurgo em 30 dias
 * (`lgpd.dias_expurgo`).
 */
export default function Pagina() {
  return (
    <div className={estilos.pagina}>
      <article className={estilos.folha}>
        <Link className={estilos.voltar} href={ROTA.HOME}>
          ← Voltar
        </Link>

        <h1 className={estilos.titulo}>Política de privacidade</h1>

        <Aviso tom="alerta" titulo="Documento pendente de redação" estatico>
          O conteúdo definitivo será fornecido pelo jurídico responsável. As seções abaixo listam o
          que a LGPD exige e o que já está decidido na arquitetura do produto.
        </Aviso>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>1. Controlador e contato</h2>
          <p className={estilos.corpo}>
            Identificação do controlador dos dados e canal de contato do encarregado (DPO), conforme
            o art. 41 da LGPD. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>2. Dados coletados</h2>
          <p className={estilos.corpo}>
            A relação abaixo reflete o modelo de dados do produto e precisa ser confirmada pelo
            jurídico:
          </p>
          <ul className={estilos.lista}>
            <li>Cadastro: nome, e-mail, cidade, idioma e foto de perfil.</li>
            <li>Artista: biografia, gêneros, links de redes e dados de cobrança.</li>
            <li>Curador: credenciais profissionais, mídias, CPF ou CNPJ e chave Pix.</li>
            <li>Conteúdo: faixas enviadas, avaliações, notas e feedback escrito.</li>
            <li>Transacional: compras de Claves, movimentações da carteira e repasses.</li>
            <li>Acesso: registros de autenticação e de ações sensíveis, para auditoria.</li>
          </ul>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>3. Finalidade e base legal</h2>
          <p className={estilos.corpo}>
            Finalidade de cada tratamento e a base legal correspondente — execução de contrato,
            obrigação legal, legítimo interesse ou consentimento. Pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>4. Compartilhamento com terceiros</h2>
          <p className={estilos.corpo}>
            Operadores e provedores envolvidos no tratamento — processamento de pagamento, envio de
            e-mail transacional, hospedagem e banco de dados. A relação final depende das decisões
            de integração ainda abertas.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>5. Retenção e exclusão</h2>
          <p className={estilos.corpo}>
            Prazos de retenção por categoria de dado. A exclusão de conta acontece em dois passos, e
            a conta desativada é apagada depois do prazo configurado. Os prazos definitivos são
            pendentes de definição.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>6. Direitos do titular</h2>
          <p className={estilos.corpo}>
            Confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação,
            informação sobre compartilhamento e revogação de consentimento (art. 18). O produto
            oferece exportação dos dados em arquivo compactado e exclusão da conta pelas
            configurações. O procedimento formal de atendimento é pendente.
          </p>
        </section>

        <section className={estilos.secao}>
          <h2 className={estilos.subtitulo}>7. Segurança</h2>
          <p className={estilos.corpo}>
            Medidas técnicas e administrativas de proteção, e o procedimento de comunicação em caso
            de incidente. Pendente.
          </p>
        </section>
      </article>
    </div>
  );
}
