import { iniciaisDe } from '@dissona/nucleo/lib/iniciais';
import type { ClasseCurador } from '@dissona/nucleo/modulos/curador/tipos';

import estilos from './VitrineDoCurador.module.css';

const ROTULO_DA_CLASSE: Record<ClasseCurador, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
};

/**
 * O cabeçalho de "Meu perfil" do curador — protótipo aprovado: a faixa
 * escura, o avatar sobreposto, o nome em Anton com o selo da classe, a
 * atuação, os gêneros e a bio. É o que os artistas veem antes de escolher.
 */
export function VitrineDoCurador({
  nome,
  fotoUrl,
  classe,
  atuacao,
  tempoAtuacao,
  generos,
  bio,
}: {
  readonly nome: string;
  readonly fotoUrl: string | null;
  readonly classe: ClasseCurador;
  readonly atuacao: readonly string[];
  readonly tempoAtuacao: string | null;
  readonly generos: readonly string[];
  readonly bio: string | null;
}) {
  const linha = [
    atuacao.join(' · '),
    tempoAtuacao === null ? null : `Atua há ${tempoAtuacao.toLowerCase()}`,
  ]
    .filter((parte) => parte !== null && parte !== '')
    .join(' · ');

  return (
    <section className={estilos.cartao} aria-label="Meu perfil">
      <div className={estilos.capa}>
        <span className={estilos.capaFaixa} aria-hidden="true" />
      </div>
      <div className={estilos.corpo}>
        <div className={estilos.identidade}>
          {fotoUrl === null ? (
            <span className={estilos.avatar} aria-hidden="true">
              {iniciaisDe(nome)}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={estilos.avatar} src={fotoUrl} alt="" />
          )}
          <div className={estilos.textos}>
            <span className={estilos.papel}>Curador</span>
            <p className={estilos.nome}>
              {nome}
              <span className={estilos.classe} data-classe={classe}>
                {ROTULO_DA_CLASSE[classe]}
              </span>
            </p>
            {linha === '' ? null : <p className={estilos.meta}>{linha}</p>}
          </div>
        </div>
        {generos.length > 0 ? (
          <ul className={estilos.generos}>
            {generos.map((genero) => (
              <li key={genero} className={estilos.genero}>
                {genero}
              </li>
            ))}
          </ul>
        ) : null}
        {bio === null || bio === '' ? null : <p className={estilos.bio}>{bio}</p>}
      </div>
    </section>
  );
}
