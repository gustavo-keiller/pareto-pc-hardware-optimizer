// @vitest-environment jsdom
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('../components/EChartsRenderer', () => ({
  default: forwardRef<HTMLDivElement>(function EChartsPlaceholder(_props, ref) {
    return <div ref={ref} data-testid="echarts-mock" />;
  }),
}));

describe('BLD-05: Interactive Part Swapper UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('allows user to swap a component in Full Builds mode and updates build telemetry', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Navigate to 4. Montar PC
    const buildsModeBtn = screen.getByRole('button', {
      name: /4\. Montar PC|4\. Full Builds/i,
    });
    await user.click(buildsModeBtn);

    // 2. Locate the "Trocar" / "Swap" button on the GPU card
    const swapGpuButtons = await screen.findAllByRole('button', {
      name: /Trocar Placa de Vídeo|Swap GPU|Swap Graphics Card/i,
    });
    expect(swapGpuButtons.length).toBeGreaterThan(0);
    await user.click(swapGpuButtons[0]);

    // 3. Modal opens with title and alternative candidates
    expect(
      await screen.findByRole('heading', {
        name: /Trocar Componente|Swap Component/i,
      }),
    ).toBeDefined();

    // 4. Modal lists alternative parts with "Escolher Esta Peça" / "Choose This Part"
    const chooseButtons = screen.getAllByRole('button', {
      name: /Escolher Esta Peça|Choose This Part/i,
    });
    expect(chooseButtons.length).toBeGreaterThan(0);

    // Click the first alternative candidate
    await user.click(chooseButtons[0]);

    // 5. Modal closes and customized banner appears
    expect(
      await screen.findByText(/Configuração Personalizada|Customized Build/i),
    ).toBeDefined();

    // 6. Reset button restores the automatically recommended build
    const resetCustomizationBtn = screen.getByRole('button', {
      name: /Restaurar Recomendação Automática|Reset to Recommended/i,
    });
    await user.click(resetCustomizationBtn);

    // Customized banner is cleared
    expect(
      screen.queryByText(/Configuração Personalizada|Customized Build/i),
    ).toBeNull();
  });
});
