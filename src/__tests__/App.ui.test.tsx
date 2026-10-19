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
});
