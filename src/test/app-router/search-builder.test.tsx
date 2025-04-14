import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchBuilderPage from '@/app/search-builder/page';
import { requireAuth } from '@/lib/auth/server';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(),
}));

// Mock the components used by the search builder page
vi.mock('@/components/search/SearchBuilderClient', () => ({
  SearchBuilderClient: ({ userId }: { userId: string }) => (
    <div data-testid="search-builder-client">Search Builder for user: {userId}</div>
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

describe('Search Builder Page', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search builder page when authenticated', async () => {
    // Mock session data
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    };
    (requireAuth as any).mockResolvedValue(mockSession);

    // Render the component
    const { container } = render(await SearchBuilderPage());

    // Verify the search builder client is rendered
    expect(screen.getByTestId('search-builder-client')).toBeInTheDocument();
    expect(screen.getByText('Search Builder for user: user123')).toBeInTheDocument();
    
    // Verify the page title and description
    expect(screen.getByText('Advanced Search Builder')).toBeInTheDocument();
    expect(
      screen.getByText('Create powerful search queries with keywords, trusted domains, and file type filtering')
    ).toBeInTheDocument();
    
    // Verify the home link
    expect(screen.getByTestId('next-link')).toHaveAttribute('href', '/');
  });
});
