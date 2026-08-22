import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { NqButton } from './ui/NqButton';

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
            
            <p className="text-white/75 text-xs sm:text-sm mb-6 leading-relaxed">
              جرّب إعادة تحميل الصفحة
            </p>

            <div className="flex flex-col gap-3">
              {/* The cube field is off here on purpose. This screen exists because something
                  already went wrong, and the fewer moving parts between the reader and the one
                  button that fixes it, the better — a WebGL context is also the last thing worth
                  asking for from a page that has just crashed. */}
              <NqButton
                tone="chrome"
                variant="solid"
                size="lg"
                radius="xl"
                block
                tiles={false}
                onClick={this.handleReload}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                إعادة تحميل المنصة
              </NqButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
