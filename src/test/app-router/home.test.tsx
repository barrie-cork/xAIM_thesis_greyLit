import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';
import { getSession } from '@/lib/auth/server';

// Mock the auth server utilities
vi.mock('@/lib/auth/server', () => ({
  getSession: vi.fn(),
}));

// Mock the components used by the home page
vi.mock('@/components/landing/LandingPage', () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock('@/components/dashboard/Dashboard', () => ({
  Dashboard: ({ userId }: { userId: string }) => (
    <div data-testid="dashboard">Dashboard for user: {userId}</div>
  ),
}));

describe('Home Page', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the landing page when not authenticated', async () => {
    // Mock session data
    (getSession as any).mockResolvedValue(null);

    // Render the component
    const { container } = render(await HomePage());

    // Verify the landing page is rendered
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('should render the dashboard when authenticated', async () => {
    // Mock session data
    const mockSession = {
      user: {
        id: 'user123',
        email: 'test@example.com',
      },
    };
    (getSession as any).mockResolvedValue(mockSession);

    // Render the component
    const { container } = render(await HomePage());

    // Verify the dashboard is rendered
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard for user: user123')).toBeInTheDocument();
  });
});
