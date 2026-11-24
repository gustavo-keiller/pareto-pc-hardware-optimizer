import React, { Suspense, lazy, useState } from 'react';
import { MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { AppLocale, t } from '../utils/i18n';

const FooterModals = lazy(() => import('./FooterModals'));

export interface AppFooterProps {
  locale: AppLocale;
}

export const AppFooter: React.FC<AppFooterProps> = ({ locale }) => {
  const [activeDialog, setActiveDialog] = useState<'legal' | 'feedback' | null>(
    null,
  );

  return (
    <footer className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 pt-5 border-t border-slate-800/80 text-xs text-slate-400">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>{t('footerAffiliateDisclosure', locale)}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="open-legal-modal"
            onClick={() => setActiveDialog('legal')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            {t('footerLegalBtn', locale)}
          </button>
          <button
            type="button"
            data-testid="open-feedback-modal"
            onClick={() => setActiveDialog('feedback')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <MessageSquareWarning className="h-3 w-3 text-amber-400" />
            {t('footerFeedbackBtn', locale)}
          </button>
        </div>
      </div>

      {activeDialog !== null && (
        <Suspense fallback={null}>
          <FooterModals
            locale={locale}
            activeDialog={activeDialog}
            onClose={() => setActiveDialog(null)}
          />
        </Suspense>
      )}
    </footer>
  );
};
