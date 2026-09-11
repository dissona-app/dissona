import { soundcloudLigado } from '@/lib/ambiente';

import estilos from './BotoesSociais.module.css';

export type PropsBotoesSociais = {
  /** `entrarComProvedor` — sempre redireciona, nunca devolve resultado. */
  readonly acao: (dados: FormData) => Promise<void>;
  /** Destino a preservar através do provedor. */
  readonly proximo?: string;
  readonly rotulos: {
    readonly google: string;
    readonly facebook: string;
    readonly soundcloud: string;
  };
  /** "Entrar com" no login, "Criar conta com" no cadastro — vai no `title`. */
  readonly verbo: string;
};

/**
 * Os três botões de provedor, um componente para as duas telas.
 *
 * Google e Facebook são providers nativos do Supabase Auth. SoundCloud **não
 * é**: entra como custom OAuth provider (OAuth 2.1 + PKCE, com
 * `email_optional`, porque o `/me` deles não devolve e-mail), e por isso
 * depende de `SOUNDCLOUD_LIGADO` — a flag diz se o provider existe no projeto.
 *
 * Com a flag desligada o botão continua na tela, desabilitado e com o motivo no
 * `title`, em vez de sumir: é a mesma decisão da navegação por release — a
 * pessoa vê o que o produto oferece, e a forma da tela não muda a cada
 * entrega.
 *
 * **Server Component.** Cada botão é um `<form action>` com Server Action, sem
 * estado de cliente: o clique sai daqui direto para o domínio do provedor, e
 * não há nada a renderizar no meio. Funciona sem JavaScript.
 */
export function BotoesSociais({ acao, proximo, rotulos, verbo }: PropsBotoesSociais) {
  const provedores = [
    { chave: 'google', rotulo: rotulos.google, sigla: 'G', cor: '#4285F4', ligado: true },
    { chave: 'facebook', rotulo: rotulos.facebook, sigla: 'f', cor: '#1877F2', ligado: true },
    {
      chave: 'soundcloud',
      rotulo: rotulos.soundcloud,
      sigla: '≈',
      cor: '#FF5500',
      ligado: soundcloudLigado(),
    },
  ] as const;

  return (
    <div className={estilos.provedores}>
      {provedores.map((provedor) =>
        provedor.ligado ? (
          <form key={provedor.chave} action={acao} className={estilos.formulario}>
            <input type="hidden" name="provedor" value={provedor.chave} />
            {proximo === undefined ? null : (
              <input type="hidden" name="proximo" value={proximo} />
            )}
            <button
              type="submit"
              className={estilos.provedor}
              title={`${verbo} ${provedor.rotulo}`}
            >
              <span className={estilos.sigla} style={{ color: provedor.cor }}>
                {provedor.sigla}
              </span>
              {provedor.rotulo}
            </button>
          </form>
        ) : (
          <button
            key={provedor.chave}
            type="button"
            className={estilos.provedor}
            disabled
            title={`${provedor.rotulo} ainda não está disponível neste ambiente`}
          >
            <span className={estilos.sigla} style={{ color: provedor.cor }}>
              {provedor.sigla}
            </span>
            {provedor.rotulo}
          </button>
        ),
      )}
    </div>
  );
}
