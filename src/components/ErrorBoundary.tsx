import type { ErrorInfo, ReactNode } from 'react'
import { Alert, AlertActionCloseButton, Button } from '@patternfly/react-core'
import { Component } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error boundary component that catches React errors and displays a fallback UI.
 * Prevents the entire app from crashing when a component throws an error.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Alert
            variant="danger"
            title={this.props.fallbackTitle || 'Something went wrong'}
            actionClose={<AlertActionCloseButton onClose={this.handleReset} />}
          >
            <p>An error occurred in this component:</p>
            {this.state.error && (
              <pre style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.875rem',
              }}
              >
                {this.state.error.message}
              </pre>
            )}
            {this.state.errorInfo && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Stack Trace</summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <Button
              variant="primary"
              onClick={this.handleReset}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </Button>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
