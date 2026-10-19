import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ResultsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RESULTS ERROR BOUNDARY] Caught rendering crash:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="results-error-boundary-card"
          className="bg-[#FFFFFF] border border-[#E8481C]/40 rounded-xl p-6 sm:p-8 my-6 text-center space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-[#E8481C]/10 text-[#E8481C] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" strokeWidth={2} />
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-[#111111] mb-1">
              Something went wrong reading the response
            </h3>
            <p className="text-xs sm:text-sm text-[#5A5A5A] leading-relaxed">
              {this.props.fallbackMessage ||
                'We received the analysis from the AI, but encountered an issue displaying the card results. Please try running the evaluation again.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="error-boundary-retry-btn"
              type="button"
              onClick={this.handleReset}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] hover:bg-black text-white text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>

            {this.state.error && (
              <button
                type="button"
                onClick={this.toggleDetails}
                className="cursor-pointer inline-flex items-center gap-1 text-xs text-[#7A7A7A] hover:text-[#111111] font-mono transition-colors"
              >
                <span>{this.state.showDetails ? 'Hide details' : 'Show details'}</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          {this.state.showDetails && this.state.error && (
            <div className="text-left bg-[#F5F4F0] border border-[#E0DEDA] rounded-lg p-3 max-w-xl mx-auto overflow-x-auto text-[11px] font-mono text-[#E8481C]">
              <p className="font-semibold mb-1">{this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <pre className="text-[10px] text-[#7A7A7A] whitespace-pre-wrap leading-tight">
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
