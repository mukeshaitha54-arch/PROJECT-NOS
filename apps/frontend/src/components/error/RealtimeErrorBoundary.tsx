'use client';
import React, { Component, ReactNode } from 'react';
import { WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RealtimeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Real-time connection boundary caught error:', error, errorInfo);
  }

  handleForceReconnect = () => {
    // We can't directly call socket.connect() here without context,
    // but the error is caught so we can just reload the page or reset boundary.
    // In a real app we might pass a reconnect callback via props or a global event.
    // For now, reloading the page ensures a clean reconnection attempt.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
            <div className="bg-red-500/20 p-4 rounded-full mb-4">
              <WifiOff className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-time connection interrupted</h3>
            <p className="text-sm text-slate-400 mb-6">
              Dashboard data may be stale. Attempting to reconnect...
            </p>
            <button
              onClick={this.handleForceReconnect}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              Force Reconnect
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
