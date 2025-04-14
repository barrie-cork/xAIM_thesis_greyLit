import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { SearchBuilderClient } from '@/components/search/SearchBuilderClient';
import { SearchResultsClient } from '@/components/search/SearchResultsClient';
import { SavedSearchesClient } from '@/components/search/SavedSearchesClient';

// Mock the LogoutButton component
vi.mock('@/components/auth/LogoutButton', () => ({
  LogoutButton: () => <button data-testid="logout-button">Logout</button>,
}));

// Mock the SearchBuilder component
vi.mock('@/components/search/SearchBuilder', () => ({
  default: () => <div data-testid="search-builder">Search Builder Component</div>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

// Mock the API
vi.mock('@/utils/api', () => ({
  api: {
    search: {
      getSaved: {
        useQuery: vi.fn().mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
        }),
      },
      delete: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          isLoading: false,
        }),
      },
    },
  },
}));

describe('Client Components', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard', () => {
    it('should render the dashboard with user ID', () => {
      // Render the component
      render(<Dashboard userId="user123" />);

      // Verify the dashboard is rendered
      expect(screen.getByText('Grey Literature Search App')).toBeInTheDocument();
      expect(screen.getByText('Advanced Search Builder')).toBeInTheDocument();
      expect(screen.getByText('Saved Searches')).toBeInTheDocument();
      expect(screen.getByText('Document Review')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();

      // Verify the links
      const links = screen.getAllByTestId('next-link');
      expect(links[0]).toHaveAttribute('href', '/search-builder');
      expect(links[1]).toHaveAttribute('href', '/saved-searches');
    });
  });

  describe('SearchBuilderClient', () => {
    it('should render the search builder client with user ID', () => {
      // Render the component
      render(<SearchBuilderClient userId="user123" />);

      // Verify the search builder client is rendered
      expect(screen.getByTestId('search-builder')).toBeInTheDocument();
      expect(screen.getByText('Search Builder Component')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });
  });

  describe('SearchResultsClient', () => {
    it('should render loading state initially', () => {
      // Render the component
      render(<SearchResultsClient searchId="search123" userId="user123" />);

      // Verify the loading state is rendered
      expect(screen.getByText('Loading search results...')).toBeInTheDocument();
    });

    it('should pass a placeholder test for results', () => {
      expect(true).toBe(true);
    });
  });

  describe('SavedSearchesClient', () => {
    it('should pass a placeholder test', () => {
      expect(true).toBe(true);
    });
  });
});
