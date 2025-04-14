'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

interface SyncUsersClientProps {
  userId: string;
}

export function SyncUsersClient({ userId }: SyncUsersClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    error?: string;
  } | null>(null);

  const handleSyncCurrentUser = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'User synchronized successfully',
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to synchronize user',
          error: data.message || data.error || 'Unknown error',
        });
      }
    } catch (error) {
      console.error('Error synchronizing user:', error);
      setResult({
        success: false,
        message: 'Failed to synchronize user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAllUsers = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Users synchronized successfully',
          count: data.count || 0,
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to synchronize users',
          error: data.message || data.error || 'Unknown error',
        });
      }
    } catch (error) {
      console.error('Error synchronizing users:', error);
      setResult({
        success: false,
        message: 'Failed to synchronize users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Synchronize Current User</h2>
        <p className="mb-4">
          This will synchronize your user account from Supabase Auth to the user database table.
        </p>
        <Button
          onClick={handleSyncCurrentUser}
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? 'Synchronizing...' : 'Synchronize Current User'}
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Synchronize All Users</h2>
        <p className="mb-4">
          This will synchronize all users from Supabase Auth to the user database table.
          This operation may take some time depending on the number of users.
        </p>
        <Button
          onClick={handleSyncAllUsers}
          disabled={isLoading}
          className="w-full md:w-auto"
        >
          {isLoading ? 'Synchronizing...' : 'Synchronize All Users'}
        </Button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-md ${
            result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <h3 className="font-semibold">{result.message}</h3>
          {result.count !== undefined && (
            <p className="mt-1">Synchronized {result.count} users</p>
          )}
          {result.error && <p className="mt-1">Error: {result.error}</p>}
        </div>
      )}
    </div>
  );
}
