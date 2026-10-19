// @vitest-environment jsdom
/**
 * UI smoke tests: each mode renders, and the Simple guide's top pick reacts to the budget.
 * ECharts needs a real canvas, so charts are replaced by an empty placeholder here;
 * chart rendering is covered by the Playwright test in e2e/.
 */
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { REAL_WORLD_GPUS } from '../data/realGpus';

vi.mock('echarts-for-react', () => ({
  default: forwardRef<HTMLDivElement>(function EChartsPlaceholder(_props, ref) {
    return <div ref={ref} data-testid="echarts-placeholder" />;
  }),
}));

function topPickName(): string {
  const [first] = screen.getAllByTestId('top-choice');
  return within(first).getByRole('heading', { level: 4 }).textContent ?? '';
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('App modes', () => {
  it('Simple mode shows three recommendations', () => {
    render(<App />);
    expect(screen.getAllByTestId('top-choice')).toHaveLength(3);
    expect(topPickName()).not.toBe('');
  });

  it('Explorer, Pro, and Full Builds modes render without crashing', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /2\. Explorer/ }));
    expect(screen.queryAllByTestId('top-choice')).toHaveLength(0);
    expect(screen.getAllByTestId('echarts-placeholder').length).toBeGreaterThan(
      0,
    );
    await user.click(screen.getByRole('button', { name: /3\. Pro Lab/ }));
    expect(screen.queryAllByTestId('top-choice')).toHaveLength(0);
    expect(screen.getAllByTestId('echarts-placeholder').length).toBeGreaterThan(
      0,
    );
    await user.click(screen.getByRole('button', { name: /4\. Full Builds/ }));
    expect(screen.queryAllByTestId('top-choice')).toHaveLength(0);
    expect(screen.getByTestId('top-build-card')).toBeDefined();
    expect(screen.getByText(/Total Hardware Cost/i)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /1\. Simple Guide/ }));
    expect(screen.getAllByTestId('top-choice')).toHaveLength(3);
  });

  it('picking a different budget in Full Builds updates the top build', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /4\. Full Builds/ }));
    const topBuildCard = screen.getByTestId('top-build-card');
    const initialText = topBuildCard.textContent ?? '';

    // Switch to $2,200 Enthusiast preset
    await user.click(
      screen.getByRole('button', { name: /\$2,200 Enthusiast/i }),
    );
    const updatedText = topBuildCard.textContent ?? '';

    expect(updatedText).not.toBe(initialText);
    expect(updatedText).toContain('Total Hardware Cost');
  });

  it('picking a lower budget changes the top pick to a card within budget', async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = topPickName();
    await user.click(screen.getByRole('button', { name: '≤ $350' }));
    const after = topPickName();
    expect(after).not.toBe(before);
    const gpu = REAL_WORLD_GPUS.find((g) => g.name === after);
    expect(gpu).toBeDefined();
    expect(gpu?.price ?? Infinity).toBeLessThanOrEqual(350);
  });

  it('Trap Rule controls are visible and toggleable in Explorer mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Explorer mode
    await user.click(screen.getByRole('button', { name: /2\. Explorer/ }));

    // Trap Rule should be visible in Explorer mode
    expect(screen.getByText(/Trap Rule:/i)).toBeDefined();
    const btn5D = screen.getByRole('button', { name: /All 5 Specs \(5D\)/i });
    const btn2D = screen.getByRole('button', { name: /Strict 2D Axes/i });
    expect(btn5D).toBeDefined();
    expect(btn2D).toBeDefined();

    // Toggle to Strict 2D Axes
    await user.click(btn2D);
    expect(btn2D.className).toContain('bg-emerald-500/20');
  });

  it('switching from Pro with residuals view to Explorer gracefully falls back to 2D view', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Go to Pro Lab
    await user.click(screen.getByRole('button', { name: /3\. Pro Lab/ }));
    await user.click(
      screen.getByRole('button', { name: /Fair Value \(OLS\)/i }),
    );

    // Switch to Explorer mode
    await user.click(screen.getByRole('button', { name: /2\. Explorer/ }));

    // Should fall back to 2D Frontier instead of crashing or showing invalid tab
    expect(screen.getByRole('button', { name: /2D Frontier/i })).toBeDefined();
    expect(
      screen.queryByRole('button', { name: /Fair Value \(OLS\)/i }),
    ).toBeNull();
  });

  it('switching to Combined Sandbox shows both real baseline references and live store deals in BRL', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Combined Sandbox
    await user.click(screen.getByRole('button', { name: /Combined Sandbox/i }));

    // Verify USD to BRL exchange rate input is visible
    const rateInput = screen.getByLabelText(/USD to BRL Exchange Rate/i);
    expect(rateInput).toBeDefined();

    // Verify both live store deals and converted US reference benchmarks appear
    expect(screen.getAllByText(/US Baseline Ref/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/PowerColor Radeon RX 9060 XT 16GB/i).length,
    ).toBeGreaterThan(0);

    // Prices should be rendered in BRL (R$)
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);
  });

  it('UX-12: no [TRAP] card in the leaderboard table is ever labeled "Smart Buy"', () => {
    render(<App />);
    const trapRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('[TRAP]'));
    expect(trapRows.length).toBeGreaterThan(0);
    for (const row of trapRows) {
      expect(row.textContent).not.toContain('Smart Buy');
      expect(row.textContent).toContain('Bad Value Trap');
    }
  });

  it('UX-13: sensible default initial budget ($550) recommends an accessible mid-range GPU, not the most expensive halo card', () => {
    render(<App />);
    const topPick = topPickName();
    const gpu = REAL_WORLD_GPUS.find((g) => g.name === topPick);
    expect(gpu).toBeDefined();
    // Default initial top pick must be within the $550 sensible budget
    expect(gpu?.price ?? Infinity).toBeLessThanOrEqual(550);
    // Specifically must NOT be an $800+ ultra enthusiast card like RX 7900 XTX
    expect(gpu?.price ?? 0).toBeLessThan(800);
    // Button for <= $550 should be active
    const btn550 = screen.getByRole('button', { name: '≤ $550' });
    expect(btn550.className).toContain('bg-emerald-500/20');
  });
});
