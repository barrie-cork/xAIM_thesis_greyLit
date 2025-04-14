import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchResultsPage from '@/app/search-results/page';
import { requireAuth } from '@/lib/auth/server';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
}));

// Mock the components used by the search results page
vi.mock('@/components/search/SearchResultsClient', () => ({
  SearchResultsClient: ({ searchId, userId }: { searchId: string; userId: string }) => (
    <div data-testid="search-results-client">
      Search Results for search ID: {searchId}, user ID: {userId}
    </div>
  ),
}));

describe('Search Results Page', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search results page when authenticated with search ID', async () => {
    // Mock session data
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    };
    (requireAuth as any).mockResolvedValue(mockSession);

    // Mock search params
    const searchParams = { id: 'search123' };

    // Render the component
    const { container } = render(await SearchResultsPage({ searchParams }));

    // Verify the search results client is rendered
    expect(screen.getByTestId('search-results-client')).toBeInTheDocument();
    expect(
      screen.getByText('Search Results for search ID: search123, user ID: user123')
    ).toBeInTheDocument();
    
    // Verify the page title
    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });

  it('should show a message when no search ID is provided', async () => {
    // Mock session data
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    };
    (requireAuth as any).mockResolvedValue(mockSession);

    // Mock search params without ID
    const searchParams = {};

    // Render the component
    const { container } = render(await SearchResultsPage({ searchParams }));

    // Verify the error message is rendered
    expect(screen.getByText('No search ID provided. Please start a new search.')).toBeInTheDocument();
    expect(screen.queryByTestId('search-results-client')).not.toBeInTheDocument();
    
    // Verify the page title
    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });
});
