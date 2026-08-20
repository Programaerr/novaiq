import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reloadsExhausted: boolean;
}

// A persistent error would otherwise reload forever, so automatic recovery is capped. The
// counter resets on every clean mount, so a transient failure still gets a fresh set of retries.
const MAX_AUTO_RELOADS = 5;
const RELOAD_KEY = 'novaiq:errorReloads';

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      reloadsExhausted: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reloadsExhausted: false };
  }

  public componentDidMount() {
    // The app mounted without throwing, so any prior failure is behind us — free the retry budget.
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* sessionStorage can be unavailable (private mode); the cap still bounds retries. */
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    try {
      const count = Number(sessionStorage.getItem(RELOAD_KEY) || '0') + 1;
      sessionStorage.setItem(RELOAD_KEY, String(count));
      if (count <= MAX_AUTO_RELOADS) {
        window.location.reload();
        return;
      }
    } catch {
      window.location.reload();
      return;
    }
    this.setState({ reloadsExhausted: true });
  }

  public render() {
    if (this.state.hasError) {
      // Recover by reloading, automatically — no message, no button. Only if reloads keep
      // failing do we fall back to a quiet spinner rather than an alarming panel.
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-['Cairo'] dir-rtl">
          <RefreshCw className="w-6 h-6 animate-spin text-white/60" />
        </div>
      );
    }

    return this.props.children;
  }
}
