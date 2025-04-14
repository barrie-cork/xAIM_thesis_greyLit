import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SavedSearchesPage from '@/app/saved-searches/page';
import { requireAuth } from '@/lib/auth/server';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
}));

// Mock the components used by the saved searches page
vi.mock('@/components/search/SavedSearchesClient', () => ({
  SavedSearchesClient: ({ userId }: { userId: string }) => (
    <div data-testid="saved-searches-client">Saved Searches for user: {userId}</div>
  ),
}));

describe('Saved Searches Page', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the saved searches page when authenticated', async () => {
    // Mock session data
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    };
    (requireAuth as any).mockResolvedValue(mockSession);

    // Render the component
    const { container } = render(await SavedSearchesPage());

    // Verify the saved searches client is rendered
    expect(screen.getByTestId('saved-searches-client')).toBeInTheDocument();
    expect(screen.getByText('Saved Searches for user: user123')).toBeInTheDocument();
    
    // Verify the page title
    expect(screen.getByText('Saved Searches')).toBeInTheDocument();
  });
});
