// @vitest-environment jsdom
import { forwardRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

describe('SHARE-01: Influencer & Group Social Share Card Studio UI', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('paretopc_locale', 'en-US');
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the GPU Share Card Studio from Simple Mode and reflects creator handle + affiliate link live', async () => {
    const user = userEvent.setup();
    render(<App />);

    const openBtn = screen.getByTestId('open-gpu-share-card');
    await user.click(openBtn);

    const modal = await screen.findByTestId('social-share-modal');
    expect(modal).toBeDefined();

    const previewImg = screen.getByTestId('social-card-preview-img');
    const initialSrc = previewImg.getAttribute('src') ?? '';
    expect(initialSrc).toContain('data:image/svg+xml');
    expect(decodeURIComponent(initialSrc)).toContain('paretopc.com');
    expect(decodeURIComponent(initialSrc)).toContain('PARETO FRONTIER');

    const handleInput = screen.getByPlaceholderText(/TechDealsDaily/i);
    await user.type(handleInput, '@ChannelDeals');

    const storeInput = screen.getByPlaceholderText(/affiliate link/i);
    await user.type(storeInput, 'https://www.amazon.com/dp/B099TEST');

    const captionBox = screen.getByTestId('social-caption-preview');
    const captionVal =
      captionBox instanceof HTMLTextAreaElement ? captionBox.value : '';
    expect(captionVal).toContain('Priority Split (%)');
    expect(captionVal).toContain('https://www.amazon.com/dp/B099TEST');
    expect(captionVal).toContain('ref=%40ChannelDeals');

    const closeBtn = screen.getByRole('button', {
      name: /Close share card studio/i,
    });
    await user.click(closeBtn);
    expect(screen.queryByTestId('social-share-modal')).toBeNull();
  });

  it('opens the Full PC Build Share Card Studio from Full Builds Mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^Full Builds/i }));

    const openBuildShareBtn = await screen.findByTestId(
      'open-build-share-card',
    );
    await user.click(openBuildShareBtn);

    const modal = await screen.findByTestId('social-share-modal');
    expect(modal).toBeDefined();

    const captionBox = screen.getByTestId('social-caption-preview');
    const captionVal =
      captionBox instanceof HTMLTextAreaElement ? captionBox.value : '';
    expect(captionVal).toContain('Pareto Frontier Full PC Build');
    expect(captionVal).toContain('mode=builds');
  });

  it('DATA-04 & DATA-BF26: displays verified store attribution and omits USD estimation warning in default pt-BR mode', async () => {
    localStorage.clear();
    render(<App />);

    const storeBadge = screen.getByTestId('top-pick-store-badge');
    expect(storeBadge.textContent).toMatch(
      /KaBuM!|TerabyteShop|Pichau|Amazon BR/,
    );

    const storeLinks = screen.getAllByRole('link', { name: /Ver na Loja/i });
    expect(storeLinks.length).toBeGreaterThan(0);

    expect(
      screen.queryByText(/Preço estimado \(convertido de US\$\)/i),
    ).toBeNull();
  });

  it('AFF-03, AFF-05 & LAUNCH-03/05: displays creator banner with affiliate tags, affiliate disclosure, and legal/feedback modals', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    window.history.pushState(
      {},
      '',
      '/?ref=@CanalTeste&amz=canalteste-20&kabum=canalkabum&terabyte=canaltera&pichau=canalpichau',
    );

    try {
      render(<App />);

      const banner = screen.getByTestId('creator-attribution-banner');
      expect(banner.textContent).toContain('@CanalTeste');

      const storeLinks = screen.getAllByRole('link', { name: /Ver na Loja/i });
      expect(storeLinks.length).toBeGreaterThan(0);
      const href = storeLinks[0].getAttribute('href') ?? '';
      expect(href).toContain('utm_source=paretopc');
      expect(href).toContain('utm_campaign=canalteste');

      expect(
        screen.getByText(/podemos receber comissão por links de parceiros/i),
      ).toBeDefined();

      // Open Legal Modal (LGPD/GDPR)
      await user.click(screen.getByTestId('open-legal-modal'));
      expect(await screen.findByTestId('legal-modal')).toBeDefined();
      await user.click(screen.getAllByRole('button', { name: /^Fechar$/i })[0]);
      expect(screen.queryByTestId('legal-modal')).toBeNull();

      // Open Feedback Modal
      await user.click(screen.getByTestId('open-feedback-modal'));
      expect(await screen.findByTestId('feedback-modal')).toBeDefined();
      await user.type(
        screen.getByPlaceholderText(/RX 6600 subiu/i),
        'RX 6600 R$ 1.349 hoje na KaBuM!',
      );
      await user.click(
        screen.getByRole('button', { name: /Copiar & Registrar Relatório/i }),
      );
      expect(
        await screen.findByText(/Relatório registrado e copiado/i),
      ).toBeDefined();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});
