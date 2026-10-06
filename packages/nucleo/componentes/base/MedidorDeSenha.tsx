import { forcaDaSenha, senhaTemNumero, senhaTemTamanho } from '@dissona/nucleo/lib/senha';
import type { NivelDeForca } from '@dissona/nucleo/lib/senha';

import estilos from './MedidorDeSenha.module.css';

export type PropsMedidorDeSenha = {
  readonly senha: string;
  /** Textos por nível, do vazio ao forte. Vêm de `textos/prototipo.ts`. */
  readonly rotulos: readonly [string, string, string, string];
  /** Rótulos dos dois requisitos com *dot*, na ordem da tela. */
  readonly requisitos: { readonly tamanho: string; readonly numero: string };
};

const CLASSE_NIVEL: Record<NivelDeForca, string | undefined> = {
  0: estilos.vazio,
  1: estilos.fraca,
  2: estilos.media,
  3: estilos.forte,
};

/**
 * Medidor de força de senha — Design System §2.2.9.
 *
 * Três barras e um rótulo, mais os dois requisitos com *dot*. O cálculo é de
 * `lib/senha.ts`, e não daqui: o Zod do cadastro precisa da mesma regra, e ter
 * duas implementações produziria um formulário que mostra "Senha forte" e
 * recusa o envio.
 *
 * **Não** bloqueia nada. O medidor informa; quem barra é a política
 * (`senhaAtendePolitica`), e ela pede menos do que "forte" — uma senha de nível
 * 2 é aceita. Tratar o medidor como validação faria a tela exigir símbolo ou
 * maiúscula, que não é o que a regra diz.
 *
 * ## Divergência de cor, registrada
 *
 * O protótipo pinta o **texto** do nível médio com `#a8761c` e o do forte com
 * `#2fa565`. Nenhum dos dois passa AA sobre branco como cor de texto (3,4:1 e
 * 3,1:1), e a Definition of Done pede AA. As barras — que são indicador
 * gráfico, sem exigência de contraste — ficam com as cores do protótipo; o
 * texto usa os pares `-fg` correspondentes. É a mesma decisão que o projeto já
 * tinha tomado para `--dsn-success-dot`, cujo comentário em `tokens.css` diz
 * "nunca como cor de texto".
 *
 * `aria-live="polite"`: o rótulo muda a cada tecla, e sem isso quem usa leitor
 * de tela digita a senha inteira sem saber que existe um medidor. `polite`, e
 * não `assertive`, para não interromper a digitação.
 */
export function MedidorDeSenha({ senha, rotulos, requisitos }: PropsMedidorDeSenha) {
  const nivel = forcaDaSenha(senha);
  const temTamanho = senhaTemTamanho(senha);
  const temNumero = senhaTemNumero(senha);

  return (
    <div className={[estilos.envolvente, CLASSE_NIVEL[nivel]].filter(Boolean).join(' ')}>
      <div className={estilos.medidor}>
        <div className={estilos.barras} aria-hidden="true">
          <span className={nivel >= 1 ? estilos.barraAtiva : estilos.barra} />
          <span className={nivel >= 2 ? estilos.barraAtiva : estilos.barra} />
          <span className={nivel >= 3 ? estilos.barraAtiva : estilos.barra} />
        </div>
        <span className={estilos.rotulo} role="status" aria-live="polite">
          {rotulos[nivel]}
        </span>
      </div>

      <ul className={estilos.requisitos}>
        <Requisito atendido={temTamanho}>{requisitos.tamanho}</Requisito>
        <Requisito atendido={temNumero}>{requisitos.numero}</Requisito>
      </ul>
    </div>
  );
}

function Requisito({
  atendido,
  children,
}: {
  readonly atendido: boolean;
  readonly children: string;
}) {
  return (
    <li className={atendido ? estilos.requisitoAtendido : estilos.requisito}>
      <span className={estilos.dot} aria-hidden="true" />
      {children}
      {/* A cor não pode ser o único portador da informação (§4.2). O texto
          entre parênteses só existe para o leitor de tela. */}
      <span className="dsn-apenas-leitor">{atendido ? ' (atendido)' : ' (pendente)'}</span>
    </li>
  );
}
