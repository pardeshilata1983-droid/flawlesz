import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL UI ERROR BOUNDARY CAUGHT]', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/flaw';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F4F0] text-[#111111] flex items-center justify-center p-6 select-none">
          <div className="max-w-lg w-full bg-white rounded-2xl p-8 border border-[#E0DEDA] shadow-xl text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-[#E8481C] flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[#111111]">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h2>
              <p className="text-sm text-[#5A5A5A] leading-relaxed">
                {this.props.fallbackMessage ||
                  'An unexpected rendering issue occurred. Your data is safe. Click below to recover the view.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E0DEDA] text-left text-xs font-mono text-[#555555] overflow-auto max-h-32">
                <span className="font-bold text-rose-700 block mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </span>
                {this.state.error.stack && (
                  <span className="text-[10px] text-[#777777] block whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#D0CECA] text-[#111111] text-xs font-semibold hover:bg-[#FAF9F6] transition-colors cursor-pointer shadow-2xs"
              >
                <Home className="w-3.5 h-3.5 text-[#555555]" />
                <span>Go to Overview</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
