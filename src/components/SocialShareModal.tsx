import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Sparkles, Share2, X } from 'lucide-react';
import { PcBuild } from '../lib/math/buildTypes';
import { PreferenceWeights, RankedGpu } from '../lib/math/types';
import { AppLocale, t } from '../utils/i18n';
import {
  copyTextToClipboard,
  encodeBuildShareUrl,
  encodeGpuShareUrl,
} from '../utils/shareBuild';
import {
  buildGpuSocialCardSvg,
  buildPcBuildSocialCardSvg,
  CreatorShareConfig,
  downloadSvgAsPng,
  formatSocialPostCaption,
  getBuildPriorityPercentages,
  normalizePriorityPercentages,
} from '../utils/socialShareCard';
import { safeGetJSON, safeSetJSON } from '../utils/storage';

export type SocialShareTarget =
  | {
      kind: 'gpu';
      gpu: RankedGpu;
      weights: PreferenceWeights;
      budget: number;
      uiMode: 'simple' | 'explorer' | 'pro';
      reason?: string;
    }
  | {
      kind: 'build';
      build: PcBuild;
    };

export interface SocialShareModalProps {
  target: SocialShareTarget;
  currency: 'USD' | 'BRL';
  locale: AppLocale;
  onClose: () => void;
}

const CREATOR_CONFIG_STORAGE_KEY = 'paretopc_creator_share_config';

const DEFAULT_CREATOR_CONFIG: CreatorShareConfig = {
  refTag: '',
  amazonTag: '',
  customStoreUrl: '',
  siteName: 'ParetoPC',
  siteDomain: 'paretopc.com',
};

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  target,
  currency,
  locale,
  onClose,
}) => {
  const [creatorConfig, setCreatorConfig] = useState<CreatorShareConfig>(
    () => ({
      ...DEFAULT_CREATOR_CONFIG,
      ...safeGetJSON<CreatorShareConfig>(
        CREATOR_CONFIG_STORAGE_KEY,
        DEFAULT_CREATOR_CONFIG,
      ),
    }),
  );
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [bundledDone, setBundledDone] = useState(false);

  useEffect(() => {
    safeSetJSON(CREATOR_CONFIG_STORAGE_KEY, creatorConfig);
  }, [creatorConfig]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const baseOrigin =
    creatorConfig.siteDomain && creatorConfig.siteDomain.trim().length > 0
      ? `https://${creatorConfig.siteDomain
          .trim()
          .replace(/^https?:\/\//, '')
          .replace(/\/+$/, '')}`
      : undefined;

  const shareUrl = useMemo(() => {
    if (target.kind === 'gpu') {
      return encodeGpuShareUrl(
        {
          gpuId: target.gpu.id,
          budget: target.budget,
          currency,
          weights: target.weights,
          mode: target.uiMode,
          ref: creatorConfig.refTag,
          amz: creatorConfig.amazonTag,
          storeUrl: creatorConfig.customStoreUrl,
        },
        baseOrigin,
      );
    }

    const b = target.build;
    return encodeBuildShareUrl(
      {
        cpuId: b.cpu.id,
        gpuId: b.gpu.id,
        moboId: b.motherboard.id,
        ramId: b.ram.id,
        psuId: b.psu.id,
        storageId: b.storage.id,
        caseId: b.case.id,
        coolerId: b.cooler.id,
        budget: b.totalPrice,
        workload: b.workloadProfile,
        currency,
        buildId: b.id,
        ref: creatorConfig.refTag,
        amz: creatorConfig.amazonTag,
        storeUrl: creatorConfig.customStoreUrl,
      },
      baseOrigin,
    );
  }, [target, currency, creatorConfig, baseOrigin]);

  const prioritySlices = useMemo(() => {
    if (target.kind === 'gpu') {
      return normalizePriorityPercentages(target.weights, locale).filter(
        (s) => s.pct > 0,
      );
    }
    return getBuildPriorityPercentages(target.build, locale).filter(
      (s) => s.pct > 0,
    );
  }, [target, locale]);

  const svgString = useMemo(() => {
    if (target.kind === 'gpu') {
      return buildGpuSocialCardSvg({
        gpu: target.gpu,
        weights: target.weights,
        shoppingReason: target.reason,
        currency,
        locale,
        creator: creatorConfig,
        shareUrl,
      });
    }
    return buildPcBuildSocialCardSvg({
      build: target.build,
      currency,
      locale,
      creator: creatorConfig,
      shareUrl,
    });
  }, [target, currency, locale, creatorConfig, shareUrl]);

  const svgPreviewSrc = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
    [svgString],
  );

  const generatedCaption = useMemo(
    () =>
      formatSocialPostCaption({
        target:
          target.kind === 'gpu'
            ? {
                kind: 'gpu',
                gpu: target.gpu,
                weights: target.weights,
                reason: target.reason,
              }
            : { kind: 'build', build: target.build },
        currency,
        locale,
        creator: creatorConfig,
        shareUrl,
      }),
    [target, currency, locale, creatorConfig, shareUrl],
  );

  const filenameBase =
    target.kind === 'gpu'
      ? `paretopc-${target.gpu.id}`
      : `paretopc-pc-${target.build.cpu.id}-${target.build.gpu.id}`;

  const handleDownloadPng = async () => {
    await downloadSvgAsPng(svgString, filenameBase);
  };

  const handleCopyCaption = async () => {
    const ok = await copyTextToClipboard(generatedCaption);
    if (ok) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2200);
    }
  };

  const handleDownloadAndCopy = async () => {
    const [, ok] = await Promise.all([
      downloadSvgAsPng(svgString, filenameBase),
      copyTextToClipboard(generatedCaption),
    ]);
    if (ok) {
      setBundledDone(true);
      setTimeout(() => setBundledDone(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-share-modal-title"
      data-testid="social-share-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="social-share-modal-title"
                className="text-base sm:text-lg font-extrabold text-white"
              >
                {t('socialModalTitle', locale)}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('socialModalSubtitle', locale)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('socialCloseModal', locale)}
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Live 1200x630 Spec Card Preview */}
          <div className="space-y-2.5">
            <img
              src={svgPreviewSrc}
              alt={t('socialModalTitle', locale)}
              data-testid="social-card-preview-img"
              className="w-full h-auto rounded-2xl border border-slate-700/80 bg-slate-950 shadow-xl"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-amber-300">
                {t('socialFrontierWeightsLabel', locale)}:
              </span>
              {prioritySlices.map((slice) => (
                <span
                  key={slice.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  {slice.label}: {slice.pct}%
                </span>
              ))}
            </div>
          </div>

          {/* Creator / Influencer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label className="space-y-1 text-xs">
              <span className="block font-bold text-slate-300">
                {t('socialCreatorHandleLabel', locale)}
              </span>
              <input
                type="text"
                value={creatorConfig.refTag ?? ''}
                onChange={(e) =>
                  setCreatorConfig((prev) => ({
                    ...prev,
                    refTag: e.target.value,
                  }))
                }
                placeholder={t('socialCreatorHandlePlaceholder', locale)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="block font-bold text-slate-300">
                {t('socialAmazonTagLabel', locale)}
              </span>
              <input
                type="text"
                value={creatorConfig.amazonTag ?? ''}
                onChange={(e) =>
                  setCreatorConfig((prev) => ({
                    ...prev,
                    amazonTag: e.target.value,
                  }))
                }
                placeholder={t('socialAmazonTagPlaceholder', locale)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="block font-bold text-slate-300">
                {t('socialAffiliateUrlLabel', locale)}
              </span>
              <input
                type="url"
                value={creatorConfig.customStoreUrl ?? ''}
                onChange={(e) =>
                  setCreatorConfig((prev) => ({
                    ...prev,
                    customStoreUrl: e.target.value,
                  }))
                }
                placeholder={t('socialAffiliateUrlPlaceholder', locale)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <label className="space-y-1 text-xs">
                <span className="block font-semibold text-slate-400">
                  {t('socialSiteBrandLabel', locale)}
                </span>
                <input
                  type="text"
                  value={creatorConfig.siteName ?? ''}
                  onChange={(e) =>
                    setCreatorConfig((prev) => ({
                      ...prev,
                      siteName: e.target.value,
                    }))
                  }
                  placeholder="ParetoPC"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="block font-semibold text-slate-400">URL</span>
                <input
                  type="text"
                  value={creatorConfig.siteDomain ?? ''}
                  onChange={(e) =>
                    setCreatorConfig((prev) => ({
                      ...prev,
                      siteDomain: e.target.value,
                    }))
                  }
                  placeholder="paretopc.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Ready-to-Post Caption Preview */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-300">
              {t('socialPreviewCaptionTitle', locale)}
            </div>
            <textarea
              readOnly
              rows={5}
              value={generatedCaption}
              data-testid="social-caption-preview"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadPng}
              data-testid="share-download-png-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <Download className="h-4 w-4 text-sky-400" />
              {t('socialDownloadPngBtn', locale)}
            </button>

            <button
              type="button"
              onClick={handleCopyCaption}
              data-testid="share-copy-caption-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              {copiedCaption ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">
                    {t('socialCaptionCopied', locale)}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-amber-400" />
                  {t('socialCopyCaptionBtn', locale)}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadAndCopy}
              data-testid="share-bundle-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              {bundledDone ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('socialBundleDone', locale)}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('socialBundleBtn', locale)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
