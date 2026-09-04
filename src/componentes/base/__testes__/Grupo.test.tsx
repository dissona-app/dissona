import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Grupo } from '../Grupo';

type Papel = 'artista' | 'curador';

const OPCOES = [
  { valor: 'artista' as Papel, rotulo: 'Artista' },
  { valor: 'curador' as Papel, rotulo: 'Curador' },
];

function montar(valor: Papel = 'artista', onMudar = vi.fn()) {
  render(<Grupo rotulo="Perfil" opcoes={OPCOES} valor={valor} onMudar={onMudar} />);
  return { onMudar };
}

describe('Grupo', () => {
  it('expõe semântica de radiogroup', () => {
    montar();
    const grupo = screen.getByRole('radiogroup', { name: 'Perfil' });
    expect(grupo).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Artista' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Curador' })).not.toBeChecked();
  });

  it('mantém um único ponto de tabulação no grupo', () => {
    montar();
    expect(screen.getByRole('radio', { name: 'Artista' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Curador' })).toHaveAttribute('tabindex', '-1');
  });

  it('move a seleção com as setas', async () => {
    const usuario = userEvent.setup();
    const { onMudar } = montar('artista');

    await usuario.tab();
    expect(screen.getByRole('radio', { name: 'Artista' })).toHaveFocus();

    await usuario.keyboard('{ArrowRight}');
    expect(onMudar).toHaveBeenCalledWith('curador');
  });

  it('circula da última para a primeira', async () => {
    const usuario = userEvent.setup();
    const { onMudar } = montar('curador');

    await usuario.tab();
    await usuario.keyboard('{ArrowRight}');
    expect(onMudar).toHaveBeenCalledWith('artista');
  });

  it('seleciona por clique', async () => {
    const usuario = userEvent.setup();
    const { onMudar } = montar('artista');

    await usuario.click(screen.getByRole('radio', { name: 'Curador' }));
    expect(onMudar).toHaveBeenCalledWith('curador');
  });

  it('não move para uma opção desabilitada', async () => {
    const usuario = userEvent.setup();
    const onMudar = vi.fn();
    render(
      <Grupo
        rotulo="Perfil"
        opcoes={[
          { valor: 'artista' as Papel, rotulo: 'Artista' },
          { valor: 'curador' as Papel, rotulo: 'Curador', desabilitada: true },
        ]}
        valor="artista"
        onMudar={onMudar}
      />,
    );

    await usuario.tab();
    await usuario.keyboard('{ArrowRight}');
    // Só a opção habilitada entra no ciclo, então a seleção fica onde está.
    expect(onMudar).toHaveBeenCalledWith('artista');
  });

  it('associa a mensagem de erro ao grupo', () => {
    render(
      <Grupo
        rotulo="Perfil"
        opcoes={OPCOES}
        valor="artista"
        onMudar={vi.fn()}
        erro="Escolha um perfil"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um perfil');
    expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription('Escolha um perfil');
  });
});
