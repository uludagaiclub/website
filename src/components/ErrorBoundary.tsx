'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log errors in development to prevent information leakage in production
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // In production, errors should be silently handled or sent to error tracking service
    // Consider integrating with error tracking service (e.g., Sentry) here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full text-center space-y-6 p-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/10 blur-3xl"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Bir Hata Oluştu</h2>
              <p className="text-muted-foreground">
                {this.state.error?.message ?? 'Beklenmeyen bir hata meydana geldi'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} className="rounded-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tekrar Dene
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Ana Sayfa
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

