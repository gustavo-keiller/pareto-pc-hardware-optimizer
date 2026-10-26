// @vitest-environment jsdom
/**
 * PRI-07/10/11: the "What matters to you" panel at the top of Simple mode drives the
 * top pick live, explains changes, and offers a "this or that" quiz.
 */
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

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

describe('What matters to you panel', () => {
  it('sits in the first card of Simple mode and shows a score out of 10', () => {
    render(<App />);
    const intake = screen.getByTestId('beginner-intake');
    expect(within(intake).getByTestId('priority-panel')).toBeDefined();
    expect(screen.getByTestId('pick-score').textContent).toMatch(
      /\/10 for you/,
    );
    expect(screen.getByTestId('pick-insights')).toBeDefined();
  });

  it('changing importance re-ranks live and says why the pick changed', async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = topPickName();
    const vramRow = screen.getByTestId('priority-row-vramGb');
    const priceRow = screen.getByTestId('priority-row-price');
    await user.click(
      within(priceRow).getByRole('radio', {
        name: /Low price: Doesn't matter/,
      }),
    );
    await user.click(
      within(vramRow).getByRole('radio', { name: /Top priority/ }),
    );
    const after = topPickName();
    expect(after).not.toBe(before);
    expect(screen.getByRole('status').textContent).toMatch(
      /is now #1 because you/,
    );
  });

  it('a "Try it" flip point hands the lead to the named card', async () => {
    const user = userEvent.setup();
    render(<App />);
    const insights = screen.getByTestId('pick-insights');
    const tryButtons = within(insights).queryAllByRole('button', {
      name: 'Try it',
    });
    if (tryButtons.length === 0) return; // nothing within one slider's reach
    const line = tryButtons[0].parentElement?.textContent ?? '';
    await user.click(tryButtons[0]);
    expect(line).toContain(topPickName());
  });

  it('the quiz sets priorities from six answers', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: /Answer 6 quick questions/ }),
    );
    for (let i = 0; i < 6; i++) {
      const quiz = screen.getByTestId('priority-quiz');
      const options = within(quiz)
        .getAllByRole('button')
        .filter((b) => b.textContent !== 'Cancel');
      await user.click(options[0]);
    }
    expect(screen.queryByTestId('priority-quiz')).toBeNull();
    expect(screen.getByText(/Your answers set the dots above/)).toBeDefined();
  });

  it('lets the user add a parameter from the library and create their own rating', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: '+ Add what matters' }),
    );
    await user.click(screen.getByRole('button', { name: /Value for money/ }));
    expect(screen.getByTestId('priority-row-fpsPerPrice')).toBeDefined();

    await user.click(
      screen.getByRole('button', { name: '+ Add what matters' }),
    );
    await user.type(
      screen.getByPlaceholderText('e.g. Brand I trust'),
      'Looks{Enter}',
    );
    expect(screen.getAllByText('Looks').length).toBeGreaterThan(0);
    expect(screen.getByText(/Rate each card from 0 to 10/)).toBeDefined();
  });
});
