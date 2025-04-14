import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Create a test component that uses the AuthContext
const TestComponent = () => {
  const { user, session, isLoading, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'No User'}</div>
      <div data-testid="session">{session ? 'Has Session' : 'No Session'}</div>
      <button data-testid="sign-out" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should provide authentication state to children', async () => {
    // Mock Supabase client
    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'user123',
                email: 'test@example.com',
              },
            },
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    };
    (createClient as any).mockReturnValue(mockSupabase);

    // Render the component
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially, it should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for the auth state to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Verify the auth state
    expect(screen.getByTestId('user')).toHaveTextContent('user123');
    expect(screen.getByTestId('session')).toHaveTextContent('Has Session');

    // Test sign out
    await act(async () => {
      screen.getByTestId('sign-out').click();
    });

    // Verify sign out was called
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('should handle unauthenticated state', async () => {
    // Mock Supabase client
    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: null,
          },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    };
    (createClient as any).mockReturnValue(mockSupabase);

    // Render the component
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially, it should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for the auth state to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Verify the auth state
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('session')).toHaveTextContent('No Session');
  });

  it('should throw an error when useAuth is used outside of AuthProvider', () => {
    // Mock console.error to prevent error output in tests
    const originalConsoleError = console.error;
    console.error = vi.fn();

    // Expect an error when rendering the TestComponent without AuthProvider
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    // Restore console.error
    console.error = originalConsoleError;
  });
});
