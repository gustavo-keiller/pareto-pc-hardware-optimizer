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

vi.mock('../components/EChartsRenderer', () => ({
  default: forwardRef<HTMLDivElement>(function EChartsPlaceholder(_props, ref) {
    return <div ref={ref} data-testid="echarts-placeholder" />;
  }),
  EChartsRenderer: forwardRef<HTMLDivElement>(
    function EChartsPlaceholder(_props, ref) {
      return <div ref={ref} data-testid="echarts-placeholder" />;
    },
  ),
}));

vi.mock('echarts-for-react', () => ({
  default: forwardRef<HTMLDivElement>(function EChartsPlaceholder(_props, ref) {
    return <div ref={ref} data-testid="echarts-placeholder" />;
  }),
}));

vi.mock('echarts-for-react/lib/core', () => ({
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
  localStorage.setItem('paretopc_locale', 'en-US');
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
    expect(
      (await screen.findAllByTestId('echarts-placeholder')).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /3\. Pro Lab/ }));
    expect(screen.queryAllByTestId('top-choice')).toHaveLength(0);
    expect(
      (await screen.findAllByTestId('echarts-placeholder')).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /4\. Full Builds/ }));
    expect(screen.queryAllByTestId('top-choice')).toHaveLength(0);
    expect(await screen.findByTestId('top-build-card')).toBeDefined();
    expect(await screen.findByText(/Total Hardware Cost/i)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /1\. Simple Guide/ }));
    expect(screen.getAllByTestId('top-choice')).toHaveLength(3);
  });

  it('picking a different budget in Full Builds updates the top build', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /4\. Full Builds/ }));
    const topBuildCard = await screen.findByTestId('top-build-card');
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
    // Default budget is <= $550. First switch to All Limits
    await user.click(screen.getByRole('button', { name: /All Limits/i }));
    const before = topPickName();
    // Then switch down to <= $350
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

    // Switch to Explorer mode first because expert dataset controls are hidden in Simple Guide mode (UX-02)
    await user.click(screen.getByRole('button', { name: /2\. Explorer/ }));

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

  it('UX-02: hides expert dataset switchers and deal importer in Simple Guide mode, shows them in Explorer mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    // In Simple Guide (default), dataset switchers and deal importer should not be in the header
    expect(screen.queryByRole('button', { name: /Real GPUs/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Combined Sandbox/i }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /\+ Import Deals/i }),
    ).toBeNull();

    // Switch to Explorer mode
    await user.click(screen.getByRole('button', { name: /2\. Explorer/ }));

    // Now expert dataset switchers and deal importer must be visible
    expect(screen.getByRole('button', { name: /Real GPUs/i })).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Combined Sandbox/i }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: /\+ Import Deals/i }),
    ).toBeDefined();
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

  it('UX-01: Answer-first beginner flow presents 3 intake questions and immediate 1 top pick + 2 alternatives above the fold', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Intake questions must be visible immediately
    expect(screen.getByTestId('beginner-intake')).toBeDefined();
    expect(screen.getByText(/Step 1 • What Are You Building\?/i)).toBeDefined();
    expect(screen.getByText(/Step 2 • Gaming Style & Workload/i)).toBeDefined();
    expect(screen.getByText(/Step 3 • Maximum Budget Limit/i)).toBeDefined();

    // Immediate answer above the fold: 1 Hero + 2 Alternatives
    expect(screen.getByTestId('simple-pick-hero')).toBeDefined();
    expect(screen.getByText(/#1 Top Recommended GPU/i)).toBeDefined();
    expect(screen.getByText(/Step-Down Bargain/i)).toBeDefined();
    expect(screen.getByText(/Step-Up Upgrade/i)).toBeDefined();

    // Selecting a different use case updates priorities
    await user.click(screen.getByText(/1080p Esports \/ Budget/i));
    expect(screen.getByTestId('simple-pick-hero')).toBeDefined();
  });

  it('UX-11: Selecting "A Whole PC Build" in beginner flow embeds complete Pareto build and provides 1-click explorer transition', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click "A Whole PC Build"
    await user.click(screen.getByRole('button', { name: /A Whole PC Build/i }));

    // Should render the complete PC build hero directly inside Simple Guide
    expect(screen.getByTestId('full-build-pick-hero')).toBeDefined();
    expect(screen.getByText(/#1 Recommended PC Build/i)).toBeDefined();
    expect(screen.getAllByText(/Total Hardware Cost/i).length).toBeGreaterThan(
      0,
    );

    // Click "Inspect & Swap Parts in Full Build Explorer →"
    const inspectBtn = screen.getByRole('button', {
      name: /Inspect & Swap Parts in Full Build Explorer/i,
    });
    await user.click(inspectBtn);

    // Verifies transition to Full Builds mode
    expect(
      screen.getByText(/Level 4: Mario Kart Full-Build Explorer/i),
    ).toBeDefined();
  });

  it('BLD-03: selecting a workload profile (e.g. Creator & AI) in beginner build mode evaluates and labels workload performance', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to whole PC build
    await user.click(screen.getByRole('button', { name: /A Whole PC Build/i }));
    expect(screen.getByTestId('full-build-pick-hero')).toBeDefined();

    // Default workload is 1440p
    expect(screen.getAllByText(/1440p Ultra/i).length).toBeGreaterThan(0);

    // Select Creator & AI workload
    await user.click(screen.getByText(/Creator & AI Workloads/i));

    // Telemetry updates to Creator & AI Index
    expect(screen.getAllByText(/Creator & AI Index/i).length).toBeGreaterThan(
      0,
    );
  });

  it('BLD-07: Build hero card renders share link and copy specs buttons with visual feedback', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);

    // Switch to whole PC build
    await user.click(
      screen.getByRole('button', { name: /A Whole PC Build|Um PC Completo/i }),
    );
    expect(screen.getByTestId('full-build-pick-hero')).toBeDefined();

    // Check share link and copy specs buttons exist
    const shareBtn = screen.getByRole('button', {
      name: /Compartilhar|Share Link/i,
    });
    const copySpecsBtn = screen.getByRole('button', {
      name: /Copiar Peças|Copy List/i,
    });
    expect(shareBtn).toBeDefined();
    expect(copySpecsBtn).toBeDefined();

    // Click copy link and check feedback
    await user.click(shareBtn);
    expect(screen.getByText(/Link Copiado!|Link Copied!/i)).toBeDefined();

    // Click copy specs and check feedback
    await user.click(copySpecsBtn);
    expect(screen.getByText(/Lista Copiada!|Specs Copied!/i)).toBeDefined();
  });

  it('UX-06: defaults to pt-BR and BRL when fresh, and toggles cleanly between Portuguese and English', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);

    // Defaults to pt-BR
    expect(
      screen.getByRole('button', { name: /1\. Guia Simples/i }),
    ).toBeDefined();
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);

    // Switch to EN
    await user.click(screen.getByRole('button', { name: /🇺🇸 EN/i }));
    expect(
      screen.getByRole('button', { name: /1\. Simple Guide/i }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: '≤ $550' })).toBeDefined();

    // Switch back to PT
    await user.click(screen.getByRole('button', { name: /🇧🇷 PT/i }));
    expect(
      screen.getByRole('button', { name: /1\. Guia Simples/i }),
    ).toBeDefined();
  });

  it('UX-05: renders mobile responsive navigation, currency-aware build presets, and avoids 0 compatible builds', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);

    // Header buttons exist for mobile navigation
    expect(screen.getByRole('button', { name: /🇧🇷 PT/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /🇺🇸 EN/i })).toBeDefined();

    // Switch to Full Builds mode in default BRL locale
    await user.click(screen.getByRole('button', { name: /4\. Montar PC/i }));
    expect(
      screen.getByRole('button', { name: /R\$ 6\.000 Ponto Ideal/i }),
    ).toBeDefined();

    // Verify top build card is rendered with BRL total cost
    expect(await screen.findByTestId('top-build-card')).toBeDefined();
    expect(screen.getAllByText(/R\$/i).length).toBeGreaterThan(0);

    // Switch to USD
    await user.click(screen.getByRole('button', { name: /🇺🇸 EN/i }));
    expect(
      screen.getByRole('button', { name: /\$1,000 Sweet Spot/i }),
    ).toBeDefined();
    expect(await screen.findByTestId('top-build-card')).toBeDefined();
  });

  it('UX-07: "See Math in 2D Explorer" button smoothly transitions user from Simple Guide pick to Explorer mode with GPU highlighted', async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<App />);

    // In default pt-BR, button text is "Ver Cálculo no Explorador 2D →"
    const seeMathBtn = screen.getByRole('button', {
      name: /Ver Cálculo no Explorador 2D/i,
    });
    expect(seeMathBtn).toBeDefined();

    // Click it to transition
    await user.click(seeMathBtn);

    // Verify mode switched to Explorer (Level 2: Visual Axis Explorer)
    expect(screen.getByText(/Level 2: Visual Axis Explorer/i)).toBeDefined();
    // Leaderboard table and comparison drawer are rendered
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
  });

  it('BLD-06: opens Upgrade Mode modal and evaluates upgrade path for owned parts', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Switch to Full Builds mode
    const buildsBtn = screen.getByRole('button', { name: /4\. Full Builds/i });
    await user.click(buildsBtn);

    // Verify Upgrade Mode button exists
    const upgradeModeBtn = await screen.findByRole('button', {
      name: /Modo Upgrade|Upgrade Mode/i,
    });
    expect(upgradeModeBtn).toBeDefined();

    // Click to open Upgrade Planner modal
    await user.click(upgradeModeBtn);

    // Verify modal content
    expect(
      await screen.findByText(/Planejador de Upgrade|Upgrade Planner/i),
    ).toBeDefined();
    expect(
      screen.getByText(
        /#1 (Melhor Rota de Upgrade|Top Recommended Upgrade Path)/i,
      ),
    ).toBeDefined();
    expect(screen.getByText(/Custo do Upgrade|Upgrade Cost/i)).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close modal/i });
    await user.click(closeBtn);
    expect(
      screen.queryByText(/Planejador de Upgrade|Upgrade Planner/i),
    ).toBeNull();
  });
});
