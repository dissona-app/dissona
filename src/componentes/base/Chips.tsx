'use client';

import { useId, useState } from 'react';

import estilos from './Chips.module.css';

export type PropsChips = {
  /** Nome do campo. Repetido em todas as caixas — o `FormData` junta. */
  readonly name: string;
  readonly opcoes: readonly string[];
  readonly selecionados: readonly string[];
  readonly rotulo: string;
  /** Texto abaixo dos chips, recalculado a cada troca — o contador do protótipo. */
  readonly contador?: (quantos: number) => string;
  /**
   * Teto de seleção. Atingido, os chips **não marcados** ficam desabilitados —
   * e só eles, para que desmarcar continue possível.
   *
   * Existe porque `perfil_artista` tem `check (array_length(generos, 1) <= 3)`:
   * sem o teto na interface, a quarta escolha viraria erro cru de banco depois
   * de o formulário inteiro ter sido preenchido. O curador não passa nada aqui
   * — `perfil_curador.generos` não tem limite.
   */
  readonly maximo?: number;
  readonly erro?: string;
};

/**
 * Seleção múltipla em chips — passos 2 e 3 do wizard.
 *
 * ## Checkbox de verdade, escondida
 *
 * O protótipo desenha os chips como `<span>` com `onClick`, e por isso nada
 * deles vai num `FormData`. Aqui cada chip é um `<label>` com
 * `<input type="checkbox">` visualmente escondido: o valor é enviado sem
 * JavaScript, `Tab` alcança, Espaço alterna, e o leitor de tela anuncia
 * "caixa de seleção, marcada" sem `role` nem `aria-checked` escritos à mão.
 *
 * O `fieldset`/`legend` é o que agrupa as caixas para o leitor de tela — sem
 * ele, "Rap nacional" é anunciado sem dizer de que pergunta é.
 *
 * ## O estado local é só o contador
 *
 * A aparência marcada/desmarcada é CSS (`:checked + span`), não React. O
 * `useState` existe porque o protótipo mostra "N gêneros escolhidos", e esse
 * texto é a única coisa que precisa recontar a cada clique. Sem JavaScript, os
 * chips continuam funcionando e só o contador fica parado — o que é a
 * degradação certa.
 */
export function Chips({ name, opcoes, selecionados, rotulo, contador, maximo, erro }: PropsChips) {
  const [marcados, setMarcados] = useState<readonly string[]>(selecionados);
  const id = useId();
  const idErro = `${id}-erro`;
  const noTeto = maximo !== undefined && marcados.length >= maximo;

  function alternar(opcao: string, marcado: boolean) {
    setMarcados((atuais) =>
      marcado ? [...atuais, opcao] : atuais.filter((cada) => cada !== opcao),
    );
  }

  return (
    <fieldset
      className={estilos.grupo}
      aria-invalid={erro !== undefined || undefined}
      aria-describedby={erro === undefined ? undefined : idErro}
    >
      <legend className={estilos.legenda}>{rotulo}</legend>

      <div className={estilos.chips}>
        {opcoes.map((opcao) => (
          <label key={opcao} className={estilos.chip}>
            <input
              type="checkbox"
              name={name}
              value={opcao}
              defaultChecked={selecionados.includes(opcao)}
              className={estilos.entrada}
              // Só o que está fora da seleção trava: desmarcar precisa seguir
              // possível, senão o teto vira um beco sem saída.
              disabled={noTeto && !marcados.includes(opcao)}
              onChange={(evento) => alternar(opcao, evento.target.checked)}
            />
            <span className={estilos.pastilha}>{opcao}</span>
          </label>
        ))}
      </div>

      {contador !== undefined ? (
        <span className={estilos.contador}>{contador(marcados.length)}</span>
      ) : null}

      {erro !== undefined ? (
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </fieldset>
  );
}
