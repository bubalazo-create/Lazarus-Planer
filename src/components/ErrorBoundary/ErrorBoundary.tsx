import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', color: 'var(--color-text)' }}>
          <h1 style={{ color: '#dc2626' }}>Application Error</h1>
          <p>The application crashed. Please report this error:</p>
          <div style={{ 
            background: '#f8717122', 
            border: '1px solid #f87171', 
            padding: '20px', 
            borderRadius: '8px',
            overflow: 'auto',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', marginTop: '10px' }}>
              {this.state.error && this.state.error.stack}
            </pre>
          </div>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            style={{
              padding: '10px 20px',
              background: '#2563eb', // changed to blue instead of red to seem less destructive
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
