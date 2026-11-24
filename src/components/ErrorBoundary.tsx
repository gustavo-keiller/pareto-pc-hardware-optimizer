import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { AppLocale, t } from '../utils/i18n';
import { safeGetString } from '../utils/storage';
import { trackTelemetryEvent } from '../utils/telemetry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error): void {
    trackTelemetryEvent('runtime_error', {
      message: (error?.message || 'unknown').slice(0, 120),
    });
  }

  private handleReset = (): void => {
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    } else {
      this.setState({ hasError: false, message: '' });
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const savedLocale = safeGetString('paretopc_locale', 'pt-BR');
    const locale: AppLocale = savedLocale === 'en-US' ? 'en-US' : 'pt-BR';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl"
        >
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <h1 className="text-lg font-extrabold text-white">
              {t('errorBoundaryTitle', locale)}
            </h1>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t('errorBoundaryDesc', locale)}
          </p>
          {this.state.message && (
            <pre className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] text-rose-300 overflow-x-auto">
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            <RotateCcw className="h-4 w-4" />
            {t('errorBoundaryReload', locale)}
          </button>
        </div>
      </div>
    );
  }
}
