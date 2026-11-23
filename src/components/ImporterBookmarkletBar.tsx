import { useState } from 'react';
import { Bookmark, Check, Copy, Cpu } from 'lucide-react';
import {
  ParsedHardwareDeal,
  convertDealsToRegionalOffers,
} from '../lib/parser/hardwareListingParser';
import { buildStoreImportBookmarklet } from '../utils/bookmarklet';
import { formatCurrency } from '../utils/currency';
import { copyTextToClipboard } from '../utils/shareBuild';

export const IMPORTER_SAMPLE_LISTINGS: ReadonlyArray<{
  readonly name: string;
  readonly store: string;
  readonly text: string;
}> = [
  {
    name: 'Pichau RX 9060 XT',
    store: 'Pichau',
    text: `Placa de Video PowerColor Radeon RX 9060 XT Reaper, 16GB, GDDR6, 128-bit, RX9060XT-16G-A-NAC de R$ 5.176,46 por:
à vista
R$ 3.899,99
no PIX com 15% desconto pichau
R$ 4.588,22
em até 12x de R$ 382,35
sem juros no cartão`,
  },
  {
    name: 'Terabyte GTX 1660 Super',
    store: 'TerabyteShop',
    text: `Placa de Vídeo Gamer Ninja NVIDIA GeForce GTX 1660 Super Ronin, 6GB, GDDR6, 192bit, GN-PV-NVGTX1660S6D6
CÓD: GN-PV-NVGTX1660S6D6 Vendido por: TerabyteShop
MAIS VENDIDO 1º Posição em [Placa de Vídeo](https://www.terabyteshop.com.br/hardware/placas-de-video)
FRETE GRÁTIS: RS,PR,SC,SP,MG,RJ,ES
De: R$ 1.449,99 por:
R$ 1.389,99
à vista com 15% de desconto no pix
R$ 1.635,28 em até 12x de R$ 136,27 sem juros no cartão`,
  },
  {
    name: 'PCYes RX 7600 XT',
    store: 'PCYes',
    text: `Placa de vídeo AMD Radeon RX 7600XT 16GB GDDR6 128 Bits Projeto Edge (PVR760016GBPEDF)
[Seja o primeiro a avaliar este produto](https://www.pcyes.com.br/placa-de-video-amd-radeon-rx-7600xt-16gb-gddr6-128-bits-projeto-edge-pvr760016gbpedf#review-form)
COD: 317981
R$ 2.944,05 Ganhe 3.090 PC Points
À vista no PIX com 5% de desconto
ou R$ 3099,00 em até 10x R$ 309,90 sem juros.`,
  },
  {
    name: 'Multi-Part PC Search (KaBuM!)',
    store: 'Multi-Category',
    text: `Processador AMD Ryzen 5 5600, 3.5GHz (4.4GHz Max Turbo), AM4 - KaBuM!
R$ 779,00 à vista no PIX

SSD 1 TB Kingston NV2, M.2 2280 PCIe, NVMe - KaBuM!
R$ 389,99 à vista no PIX

Fonte MSI MAG A650BN, ATX, 650W, 80 PLUS Bronze - KaBuM!
R$ 299,99 à vista no PIX`,
  },
];

export function StoreBookmarkletStrip() {
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  const handleCopyBookmarklet = async () => {
    const origin =
      typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://paretopc.com';
    const script = buildStoreImportBookmarklet(origin);
    await copyTextToClipboard(script);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2.5 text-xs">
      <div className="flex items-center gap-2 text-slate-300">
        <Bookmark className="h-4 w-4 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold text-emerald-300">
            1-Click Store Bookmarklet:
          </span>{' '}
          <span className="text-[11px] text-slate-400">
            Save this as a browser bookmark to import live KaBuM!, Pichau,
            Terabyte, Amazon, or Newegg listings into ParetoPC via{' '}
            <code className="text-emerald-300">#import=...</code>.
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopyBookmarklet}
        data-testid="copy-bookmarklet-btn"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 transition shrink-0"
      >
        {copiedBookmarklet ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Bookmarklet Copied!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy Bookmarklet Code
          </>
        )}
      </button>
    </div>
  );
}

export function MultiCategoryDealsPanel({
  deals,
}: {
  deals: readonly ParsedHardwareDeal[];
}) {
  const [copiedJson, setCopiedJson] = useState(false);
  if (deals.length === 0) return null;

  const handleCopyOffersJson = async () => {
    const offers = convertDealsToRegionalOffers(deals);
    await copyTextToClipboard(JSON.stringify(offers, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div
      data-testid="multi-category-deals-panel"
      className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
          <Cpu className="h-4 w-4 shrink-0" />
          <span>
            Multi-Category Catalog Matches ({deals.length} CPU / Mobo / RAM /
            SSD / PSU / Case / Cooler)
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyOffersJson}
          className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25 transition"
        >
          {copiedJson ? (
            <>
              <Check className="h-3 w-3" />
              Copied Store JSON!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy Store Offers JSON
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {deals.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-400">{item.store}</span>
              </div>
              <div className="font-semibold text-white truncate mt-0.5">
                {item.name}
              </div>
              {item.matchedComponentId && (
                <div className="text-[10px] font-mono text-emerald-400">
                  Catalog ID: {item.matchedComponentId}
                </div>
              )}
            </div>
            <div className="font-mono font-bold text-emerald-400 shrink-0">
              {item.price > 0
                ? formatCurrency(item.price, item.currency)
                : 'N/A'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
