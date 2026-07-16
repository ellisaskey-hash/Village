import { EmptyState } from './EmptyState';

/** Screen/section-level load error (PATTERNS.md §Errors): honest "couldn't load" with a retry,
 *  so a failed fetch never masquerades as an empty state. */
export function QueryError({ onRetry, body }: { onRetry: () => void; body?: string }) {
  return (
    <EmptyState
      icon="refresh"
      title="We couldn't load this"
      body={body ?? 'It might be a connection blip. Give it another go.'}
      action={{ label: 'Try again', onClick: onRetry, leadingIcon: 'refresh' }}
    />
  );
}
