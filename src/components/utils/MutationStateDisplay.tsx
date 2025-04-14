'use client';

import { Alert, AlertTitle, AlertDescription, Spinner } from '@/components/ui';

interface MutationStateDisplayProps {
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  successMessage?: string;
  loadingMessage?: string;
}

/**
 * A reusable component for displaying tRPC mutation states
 * Shows loading spinner, error messages, and success messages
 */
export function MutationStateDisplay({
  isLoading,
  error,
  isSuccess,
  successMessage = 'Operation completed successfully',
  loadingMessage = 'Processing request...',
}: MutationStateDisplayProps) {
  return (
    <div className="space-y-2">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center space-x-2">
          <Spinner size="sm" />
          <span>{loadingMessage}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Success state */}
      {isSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default MutationStateDisplay;
