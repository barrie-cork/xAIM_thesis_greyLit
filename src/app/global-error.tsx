'use client';

import { Button } from '@/components/ui';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">Something went wrong!</h2>
          <p className="text-gray-600 mb-6 max-w-md text-center">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
          <div className="flex gap-4">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Return to Home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
