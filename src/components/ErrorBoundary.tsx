import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      window.history.replaceState({}, '', window.location.pathname);
      this.setState({ hasError: false, error: null });
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-['Cairo'] dir-rtl">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">
              حدث خطأ أثناء تحميل الصفحة
            </h1>
            
            <p className="text-zinc-400 text-xs sm:text-sm mb-6 leading-relaxed">
              تم حماية التطبيق تلقائياً ومنع توقفه. يمكنك تحديث الصفحة لإعادة التحميل بكل سهولة.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="nq-btn nq-btn--solid w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="nq-btn-beam" aria-hidden="true" />
                <RefreshCw className="w-4 h-4" />
                إعادة تحميل المنصة
              </button>

              <button
                onClick={this.handleResetState}
                className="nq-btn nq-btn--ghost w-full py-3 px-6 rounded-xl font-semibold text-xs cursor-pointer"
              >
                <span className="nq-btn-beam" aria-hidden="true" />
                العودة إلى الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
