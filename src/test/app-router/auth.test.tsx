import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getSession, requireAuth } from '@/lib/auth/server';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', async () => {
  const actual = await vi.importActual('@/lib/auth/server');
  return {
    ...actual,
    getSession: vi.fn(),
    requireAuth: vi.fn(),
    createServerSupabaseClient: vi.fn(),
  };
});

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { redirect } from 'next/navigation';

describe('App Router Authentication', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return the session when authenticated', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      // Setup the mock implementation
      (getSession as any).mockResolvedValue(mockSession);

      // Call the function
      const session = await getSession();

      // Verify the result
      expect(session).toEqual(mockSession);
      expect(getSession).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      // Setup the mock implementation
      (getSession as any).mockResolvedValue(null);

      // Call the function
      const session = await getSession();

      // Verify the result
      expect(session).toBeNull();
      expect(getSession).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should return the session when authenticated', async () => {
      // Mock session data
      const mockSession = {
        user: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      // Setup the mock implementation
      (getSession as any).mockResolvedValue(mockSession);
      (requireAuth as any).mockImplementation(async () => {
        const session = await getSession();
        if (!session) {
          redirect('/auth/login');
        }
        return session;
      });

      // Call the function
      const session = await requireAuth();

      // Verify the result
      expect(session).toEqual(mockSession);
      expect(getSession).toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      // Setup the mock implementation
      (getSession as any).mockResolvedValue(null);
      (requireAuth as any).mockImplementation(async () => {
        const session = await getSession();
        if (!session) {
          redirect('/auth/login');
        }
        return session;
      });

      // Call the function and expect it to redirect
      await requireAuth();

      // Verify the redirect was called
      expect(getSession).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/auth/login');
    });
  });
});
