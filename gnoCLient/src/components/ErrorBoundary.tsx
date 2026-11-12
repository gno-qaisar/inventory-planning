import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--cream, #f8f4ed)',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              padding: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
              Workspace Error
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              An unexpected error occurred while rendering the inventory workspace:{' '}
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              type="button"
              className="btn gold"
              onClick={this.handleReload}
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
              Reload Workspace
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
