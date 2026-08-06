'use client';

import { Component, ReactNode } from 'react';
import { useTranslation } from '@/lib/use-translation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface ClassProps extends Props {
  t: (key: string, fallback?: string) => string;
}

class ErrorBoundaryClass extends Component<ClassProps, State> {
  state: State = { hasError: false, error: null };
  private unhandledRejection?: (e: PromiseRejectionEvent) => void;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount() {
    this.unhandledRejection = (e: PromiseRejectionEvent) => {
      this.setState({ hasError: true, error: e.reason instanceof Error ? e.reason : new Error(String(e.reason)) });
    };
    window.addEventListener("unhandledrejection", this.unhandledRejection);
  }

  componentWillUnmount() {
    if (this.unhandledRejection) {
      window.removeEventListener("unhandledrejection", this.unhandledRejection);
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Portal error:', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{t('errors.title', 'Something went wrong')}</h2>
            <p className="text-gray-400 text-sm mb-2">
              {t('errors.unexpected', 'An unexpected error occurred while loading this page.')}
            </p>
            {this.state.error && (
              <p className="text-red-400 text-xs font-mono bg-navy-900 rounded-lg p-3 mb-4 break-all">
                {this.state.error.message || t('errors.unknown', 'Unknown error')}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-600 transition-colors"
              >
                {t('errors.goBack', 'Go Back')}
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-semibold hover:bg-gold-400 transition-colors"
              >
                {t('errors.reload', 'Reload Page')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  const { t } = useTranslation();
  return <ErrorBoundaryClass {...props} t={t} />;
}
