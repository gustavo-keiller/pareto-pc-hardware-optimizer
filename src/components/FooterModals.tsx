import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { AppLocale, t } from '../utils/i18n';
import { copyTextToClipboard } from '../utils/shareBuild';
import { trackTelemetryEvent } from '../utils/telemetry';

interface FooterModalsProps {
  locale: AppLocale;
  activeDialog: 'legal' | 'feedback';
  onClose: () => void;
}

const FooterModals: React.FC<FooterModalsProps> = ({
  locale,
  activeDialog,
  onClose,
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = feedbackText.trim();
    if (!trimmed) return;

    trackTelemetryEvent('feedback_submitted', {
      locale,
      length: trimmed.length,
    });
    const reportPayload = `[ParetoPC Feedback | ${new Date().toISOString().slice(0, 10)} | ${locale}]\n${trimmed}`;
    await copyTextToClipboard(reportPayload);
    setFeedbackSubmitted(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSubmitted(false), 3000);
  };

  if (activeDialog === 'legal') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        data-testid="legal-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      >
        <div className="max-w-lg w-full rounded-3xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <h3
              id="legal-modal-title"
              className="text-base font-extrabold text-white"
            >
              {t('legalModalTitle', locale)}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('legalCloseBtn', locale)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t('legalPrivacyBody', locale)}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              {t('legalCloseBtn', locale)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      data-testid="feedback-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <form
        onSubmit={handleSubmitFeedback}
        className="max-w-lg w-full rounded-3xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="feedback-modal-title"
              className="text-base font-extrabold text-white"
            >
              {t('feedbackModalTitle', locale)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('feedbackModalSubtitle', locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('legalCloseBtn', locale)}
            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <textarea
          rows={4}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder={t('feedbackPlaceholder', locale)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        {feedbackSubmitted && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Check className="h-4 w-4" />
            <span>{t('feedbackSubmittedMsg', locale)}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:text-white transition"
          >
            {t('legalCloseBtn', locale)}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition"
          >
            {t('feedbackSubmitBtn', locale)}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FooterModals;
