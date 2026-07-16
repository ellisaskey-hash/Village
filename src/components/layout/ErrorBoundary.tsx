import { Component, type ReactNode } from 'react';
import { EmptyState } from '@/components/ui';

interface Props { children: ReactNode; resetKey?: string }
interface State { error: Error | null; lastKey: string | undefined }

/**
 * Route error boundary (PATTERNS.md §Application shells). A render error in any screen is caught
 * here and shown as a recoverable message instead of white-screening the whole app. Auto-resets
 * when the route changes (resetKey), so navigating away recovers without a full reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, lastKey: undefined };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // A new route: clear any error so the new screen gets a clean mount.
    if (props.resetKey !== state.lastKey) return { lastKey: props.resetKey, error: null };
    return null;
  }

  override componentDidCatch(error: Error) {
    // Surface it for observability; Sentry is wired at the app level (spec 02).
    console.error('Screen error:', error);
  }

  override render() {
    if (this.state.error) {
      return (
        <div id="main" className="mx-auto flex min-h-[60dvh] max-w-md items-center px-screenX py-10">
          <EmptyState
            icon="refresh"
            title="Something went wrong on this screen"
            body="That's on us, not you. Try again, or reload if it keeps happening."
            action={{ label: 'Try again', onClick: () => this.setState({ error: null }), leadingIcon: 'refresh' }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
