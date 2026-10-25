import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { ResolvedPriceInfo, isPriceStale } from '../lib/math/pricingEngine';
import { useUserPrices } from '../hooks/useUserPrices';
import { formatCurrency } from '../utils/currency';
import { AppLocale, t } from '../utils/i18n';
import { getStoreSearchLinks } from '../utils/storeLinks';

export interface PricedPart {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly priceInfo?: ResolvedPriceInfo;
  /** Product page of an imported deal (custom GPUs). */
  readonly url?: string;
  readonly store?: string;
}

export interface PartPriceTagProps {
  part: PricedPart;
  currency: 'USD' | 'BRL';
  locale: AppLocale;
}

const SOURCE_DOT: Record<ResolvedPriceInfo['source'], string> = {
  user: 'bg-sky-400',
  store: 'bg-emerald-400',
  estimate: 'bg-amber-400',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** One line saying where a part's price came from, in plain words. */
export function describePriceSource(
  part: PricedPart,
  currency: 'USD' | 'BRL',
  locale: AppLocale,
): { label: string; stale: boolean } {
  const info = part.priceInfo;
  const source = info?.source ?? 'estimate';
  switch (source) {
    case 'user':
      return { label: t('priceSourceUser', locale), stale: false };
    case 'store': {
      const store = info?.store ? ` · ${info.store}` : '';
      const date = info?.checkedAt
        ? ` · ${t('priceCheckedOn', locale)} ${info.checkedAt}`
        : '';
      return {
        label: `${t('priceSourceStore', locale)}${store}${date}`,
        stale: isPriceStale(info?.checkedAt, todayIso()),
      };
    }
    case 'estimate':
      return {
        label:
          currency === 'BRL'
            ? t('priceSourceEstimateConverted', locale)
            : t('priceSourceEstimateList', locale),
        stale: false,
      };
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/**
 * A part's price as a button. Opening it shows where the price came from,
 * a link to the store page, search links to check other stores, and a box
 * to type the price the buyer actually found (saved in this browser).
 */
export const PartPriceTag: React.FC<PartPriceTagProps> = ({
  part,
  currency,
  locale,
}) => {
  const [open, setOpen] = useState(false);
  const { userPrices, setPrice } = useUserPrices(currency);
  const [draft, setDraft] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && e.target instanceof Node) {
        if (!rootRef.current.contains(e.target)) setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const source = part.priceInfo?.source ?? 'estimate';
  const { label, stale } = describePriceSource(part, currency, locale);
  const productUrl = part.priceInfo?.storeUrl ?? part.url;
  const productStore = part.priceInfo?.store ?? part.store;
  const hasUserPrice = userPrices[part.id] !== undefined;

  const toggle = () => {
    setDraft(hasUserPrice ? String(userPrices[part.id]) : '');
    setOpen((v) => !v);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = draft.replace(/[^\d.,]/g, '');
    const value = Number(
      currency === 'BRL'
        ? digits.replace(/\./g, '').replace(',', '.')
        : digits.replace(/,/g, ''),
    );
    if (Number.isFinite(value) && value > 0) {
      setPrice(part.id, value);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`${t('pricePanelOpen', locale)}: ${part.name}`}
        title={label}
        data-testid={`price-tag-${part.id}`}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1 font-black text-white underline decoration-dotted decoration-slate-500 underline-offset-2 hover:decoration-white"
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${SOURCE_DOT[source]}`}
        />
        {formatCurrency(part.price, currency)}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${t('pricePanelOpen', locale)}: ${part.name}`}
          className="absolute right-0 top-full z-40 mt-1.5 w-72 space-y-2.5 rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-left text-xs font-normal normal-case tracking-normal shadow-2xl"
        >
          <div className="font-bold text-white leading-snug">{part.name}</div>
          <div className="text-slate-300">
            {label}
            {stale && (
              <span className="ml-1 text-amber-300">
                ({t('priceMaybeOutdated', locale)})
              </span>
            )}
          </div>

          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-bold text-emerald-300 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('priceOpenStorePage', locale)}
              {productStore ? ` (${productStore})` : ''}
            </a>
          )}

          <div>
            <div className="mb-1 flex items-center gap-1 text-slate-400">
              <Search className="h-3 w-3" />
              {t('priceSearchIn', locale)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getStoreSearchLinks(part.name, currency).map((link) => (
                <a
                  key={link.store}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500 hover:text-white"
                >
                  {link.store}
                </a>
              ))}
            </div>
          </div>

          <form
            onSubmit={save}
            className="space-y-1.5 border-t border-slate-800 pt-2.5"
          >
            <label
              htmlFor={`user-price-${part.id}`}
              className="block text-slate-300"
            >
              {t('priceYourPriceLabel', locale)}
            </label>
            <div className="flex gap-1.5">
              <input
                id={`user-price-${part.id}`}
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={String(Math.round(part.price))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-2.5 py-1 font-bold text-slate-950 hover:bg-emerald-400"
              >
                {t('priceSave', locale)}
              </button>
            </div>
            {hasUserPrice && (
              <button
                type="button"
                onClick={() => {
                  setPrice(part.id, null);
                  setOpen(false);
                }}
                className="font-bold text-slate-400 underline hover:text-white"
              >
                {t('priceClear', locale)}
              </button>
            )}
            <p className="text-[10px] text-slate-500">
              {t('priceSavedNote', locale)}
            </p>
          </form>
        </div>
      )}
    </div>
  );
};
