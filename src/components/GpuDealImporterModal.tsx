import { useState } from 'react';
import {
  X,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Store,
  DollarSign,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { GpuCandidate } from '../lib/math/types';
import {
  parseGpuListings,
  ParsedGpuDeal,
} from '../lib/parser/gpuListingParser';
import { formatCurrency } from '../utils/currency';

interface GpuDealImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  customGpus: GpuCandidate[];
  onAddCustomGpus: (gpus: GpuCandidate[]) => void;
  onRemoveCustomGpu: (id: string) => void;
  onClearCustomGpus: () => void;
  onSwitchToCustomDataset: () => void;
}

const SAMPLE_LISTINGS = [
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
    name: 'KaBuM! RTX 5060',
    store: 'KaBuM!',
    text: `Placa de Video Palit GeForce RTX 5060 8GB INFINITY 2 OC GDDR7 128bits - NE75060V19P1-GB2063L
Vendido e entregue por:
KaBuM!
Sobre o produto
Resumo gerado por IA

Performance de Próxima Geração: Eleve seu setup com a arquitetura NVIDIA Blackwell!
R$ 2.499,00 à vista no PIX ou R$ 2.899,00 em até 10x`,
  },
];

export function GpuDealImporterModal({
  isOpen,
  onClose,
  customGpus,
  onAddCustomGpus,
  onRemoveCustomGpu,
  onClearCustomGpus,
  onSwitchToCustomDataset,
}: GpuDealImporterModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'validate' | 'database'>(
    'paste',
  );
  const [rawText, setRawText] = useState<string>('');
  const [parsedDeals, setParsedDeals] = useState<ParsedGpuDeal[]>([]);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!rawText.trim()) return;
    const results = parseGpuListings(rawText);
    setParsedDeals(results);
    setActiveTab('validate');
  };

  const handleLoadSample = (sampleText: string) => {
    setRawText(sampleText);
    const results = parseGpuListings(sampleText);
    setParsedDeals(results);
    setActiveTab('validate');
  };

  const handleUpdateParsedDeal = (
    idx: number,
    patch: Partial<ParsedGpuDeal>,
  ) => {
    setParsedDeals((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const handleSaveAllValidated = () => {
    if (parsedDeals.length === 0) return;
    const candidatesToSave: GpuCandidate[] = parsedDeals.map((d) => ({
      id: d.id,
      name: d.name,
      vendor: d.vendor,
      price: d.price,
      priceCash: d.priceCash,
      priceInstallment: d.priceInstallment,
      originalPrice: d.originalPrice,
      currency: d.currency,
      rasterFps1440p: d.rasterFps1440p,
      rtFps1440p: d.rtFps1440p,
      vramGb: d.vramGb,
      tdpWatts: d.tdpWatts,
      store: d.store,
      url: d.url,
      chip: d.chip,
      brand: d.brand,
      isCustom: true,
      notes: d.notes,
    }));

    onAddCustomGpus(candidatesToSave);
    setParsedDeals([]);
    setRawText('');
    setActiveTab('database');
  };

  const handleSaveSingleDeal = (deal: ParsedGpuDeal) => {
    const candidate: GpuCandidate = {
      id: deal.id,
      name: deal.name,
      vendor: deal.vendor,
      price: deal.price,
      priceCash: deal.priceCash,
      priceInstallment: deal.priceInstallment,
      originalPrice: deal.originalPrice,
      currency: deal.currency,
      rasterFps1440p: deal.rasterFps1440p,
      rtFps1440p: deal.rtFps1440p,
      vramGb: deal.vramGb,
      tdpWatts: deal.tdpWatts,
      store: deal.store,
      url: deal.url,
      chip: deal.chip,
      brand: deal.brand,
      isCustom: true,
      notes: deal.notes,
    };

    onAddCustomGpus([candidate]);
    setParsedDeals((prev) => prev.filter((d) => d.id !== deal.id));
    if (parsedDeals.length <= 1) {
      setActiveTab('database');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GPU Deal Importer & Custom Database
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 border border-indigo-500/30">
                  Smart Parser
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paste raw product listings from Pichau, Terabyte, KaBuM, PCYes,
                Amazon, etc. We extract prices, VRAM, and link benchmark specs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            1. Smart Paste & Parse
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('validate')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'validate'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            2. Inspect & Validate
            {parsedDeals.length > 0 && (
              <span className="rounded-full bg-indigo-500 px-1.5 py-0.2 text-[10px] text-white font-bold">
                {parsedDeals.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'database'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            3. My Deals Database
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 font-bold">
              {customGpus.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Smart Paste & Parse */}
        {activeTab === 'paste' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label
                htmlFor="raw-listing-textarea"
                className="block text-xs font-semibold text-slate-200 mb-1"
              >
                Paste Raw Store Listing or Product Page Text:
              </label>
              <textarea
                id="raw-listing-textarea"
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste listing text from Pichau, Terabyte, KaBuM, PCYes, Amazon, etc. You can paste multiple listings separated by newlines!"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Quick Sample Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Or test with real Brazilian store examples:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_LISTINGS.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => handleLoadSample(sample.text)}
                    className="flex flex-col text-left rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition group"
                  >
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                      {sample.name}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-medium">
                      {sample.store} Listing
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setRawText('')}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear text
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Sparkles className="h-4 w-4" />⚡ Parse & Validate Listing(s)
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Inspect & Validate */}
        {activeTab === 'validate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {parsedDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <FileText className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No parsed listings yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Paste listing copy in Tab 1 or click one of the example
                  buttons.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  Go to Paste Tab
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Found {parsedDeals.length} Deal
                    {parsedDeals.length > 1 ? 's' : ''} — Verify prices and
                    benchmark links before saving:
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAllValidated}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-400 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save All to My Deals ({parsedDeals.length})
                  </button>
                </div>

                <div className="space-y-4">
                  {parsedDeals.map((deal, idx) => (
                    <div
                      key={deal.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 shadow-md"
                    >
                      {/* Deal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300">
                            {deal.store}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {deal.chip} ({deal.vendor})
                          </span>
                          {deal.brand && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {deal.brand}
                            </span>
                          )}
                        </div>

                        {deal.url && (
                          <a
                            href={deal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Store Page
                          </a>
                        )}
                      </div>

                      {/* Title & Chip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Display Name:
                          </label>
                          <input
                            type="text"
                            value={deal.name}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                name: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Store / Website:
                          </label>
                          <input
                            type="text"
                            value={deal.store}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                store: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Pricing Selection */}
                      <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-3 space-y-2">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          Price Selection for Optimization:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {deal.priceCash !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateParsedDeal(idx, {
                                  price: deal.priceCash,
                                })
                              }
                              className={`rounded-lg border p-2 text-left transition ${
                                deal.price === deal.priceCash
                                  ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                  : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-[10px] text-emerald-400 font-bold uppercase">
                                Cash / PIX (Recommended)
                              </div>
                              <div className="text-sm font-mono font-bold">
                                {formatCurrency(deal.priceCash, deal.currency)}
                              </div>
                              {deal.originalPrice && (
                                <div className="text-[10px] text-slate-500 line-through">
                                  Was:{' '}
                                  {formatCurrency(
                                    deal.originalPrice,
                                    deal.currency,
                                  )}
                                </div>
                              )}
                            </button>
                          )}

                          {deal.priceInstallment !== undefined && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateParsedDeal(idx, {
                                  price: deal.priceInstallment,
                                })
                              }
                              className={`rounded-lg border p-2 text-left transition ${
                                deal.price === deal.priceInstallment
                                  ? 'border-emerald-400 bg-emerald-500/20 text-white'
                                  : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-[10px] text-indigo-400 font-bold uppercase">
                                Credit Card / Installments
                              </div>
                              <div className="text-sm font-mono font-bold">
                                {formatCurrency(
                                  deal.priceInstallment,
                                  deal.currency,
                                )}
                              </div>
                            </button>
                          )}

                          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                              Custom Price
                            </div>
                            <input
                              type="number"
                              value={deal.price}
                              onChange={(e) =>
                                handleUpdateParsedDeal(idx, {
                                  price: Number(e.target.value),
                                })
                              }
                              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Benchmark Specs Linkage */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                          <span className="text-[10px] text-slate-400 block">
                            VRAM
                          </span>
                          <input
                            type="number"
                            value={deal.vramGb}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                vramGb: Number(e.target.value),
                              })
                            }
                            className="w-full bg-transparent font-bold text-sky-400 focus:outline-none"
                          />
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                          <span className="text-[10px] text-slate-400 block">
                            1440p Raster FPS
                          </span>
                          <input
                            type="number"
                            value={deal.rasterFps1440p}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                rasterFps1440p: Number(e.target.value),
                              })
                            }
                            className="w-full bg-transparent font-bold text-emerald-400 focus:outline-none"
                          />
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                          <span className="text-[10px] text-slate-400 block">
                            1440p Ray Tracing
                          </span>
                          <input
                            type="number"
                            value={deal.rtFps1440p}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                rtFps1440p: Number(e.target.value),
                              })
                            }
                            className="w-full bg-transparent font-bold text-white focus:outline-none"
                          />
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                          <span className="text-[10px] text-slate-400 block">
                            Power Draw (TDP)
                          </span>
                          <input
                            type="number"
                            value={deal.tdpWatts}
                            onChange={(e) =>
                              handleUpdateParsedDeal(idx, {
                                tdpWatts: Number(e.target.value),
                              })
                            }
                            className="w-full bg-transparent font-bold text-slate-200 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Warnings or Valid confirmation */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        {deal.validationWarnings.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {deal.validationWarnings.join(' · ')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            Benchmark specs linked to {deal.chip} ({deal.vendor}
                            )
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveSingleDeal(deal)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-3 py-1 font-semibold text-indigo-300 hover:bg-indigo-500/30 transition"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Save This Deal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: My Deals Database */}
        {activeTab === 'database' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white">
                  My Saved GPU Deals ({customGpus.length})
                </span>
                <p className="text-[11px] text-slate-400">
                  These custom items are evaluated across the Pareto frontier
                  and TOPSIS ranking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {customGpus.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearCustomGpus}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:underline px-2 py-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToCustomDataset();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-400 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  View Deals in Optimizer
                </button>
              </div>
            </div>

            {customGpus.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Store className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold">
                  No custom deals saved yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Use the Smart Paste tab to add GPU listings from your favorite
                  stores.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="mt-4 rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-400"
                >
                  Import a Deal
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                {customGpus.map((gpu) => (
                  <div
                    key={gpu.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                        {gpu.vramGb}G
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {gpu.name}
                          </span>
                          {gpu.store && (
                            <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300">
                              {gpu.store}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>{gpu.rasterFps1440p} FPS (1440p)</span>
                          <span>{gpu.rtFps1440p} FPS (RT)</span>
                          <span>{gpu.tdpWatts} W</span>
                          {gpu.notes && (
                            <span className="text-slate-500 truncate max-w-xs">
                              {gpu.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-emerald-400">
                          {formatCurrency(gpu.price, gpu.currency)}
                        </div>
                        {gpu.priceCash && gpu.priceInstallment && (
                          <div className="text-[10px] text-slate-400">
                            PIX vs 12x:{' '}
                            {formatCurrency(gpu.priceInstallment, gpu.currency)}
                          </div>
                        )}
                      </div>

                      {gpu.url && (
                        <a
                          href={gpu.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition"
                          title="Open Store Listing"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveCustomGpu(gpu.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete GPU Deal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
