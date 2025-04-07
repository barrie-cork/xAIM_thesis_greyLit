import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

const defaultNavigationItems = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Library', href: '/library' },
];

describe('Header', () => {
  it('renders navigation items', () => {
    render(<Header navigationItems={defaultNavigationItems} />);
    
    defaultNavigationItems.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.getByText(item.label)).toHaveAttribute('href', item.href);
    });
  });

  it('renders logo when provided', () => {
    const Logo = () => <div>Test Logo</div>;
    render(
      <Header
        navigationItems={defaultNavigationItems}
        logo={<Logo />}
      />
    );
    
    expect(screen.getByText('Test Logo')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    const Actions = () => <button>Sign In</button>;
    render(
      <Header
        navigationItems={defaultNavigationItems}
        actions={<Actions />}
      />
    );
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('handles active navigation items', () => {
    const itemsWithActive = [
      ...defaultNavigationItems,
      { label: 'Active', href: '/active', isActive: true },
    ];

    render(<Header navigationItems={itemsWithActive} />);
    
    const activeLink = screen.getByText('Active');
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(activeLink).toHaveClass('border-blue-500', 'text-gray-900');
  });

  it('toggles mobile menu', () => {
    render(<Header navigationItems={defaultNavigationItems} />);
    
    const menuButton = screen.getByRole('button', {
      name: /open main menu/i,
    });
    
    // Menu should be hidden initially
    expect(screen.getByRole('navigation', { name: /mobile navigation/i }))
      .toHaveClass('hidden');
    
    // Open menu
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation', { name: /mobile navigation/i }))
      .not.toHaveClass('hidden');
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    
    // Close menu
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation', { name: /mobile navigation/i }))
      .toHaveClass('hidden');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies custom className', () => {
    render(
      <Header
        navigationItems={defaultNavigationItems}
        className="custom-header"
      />
    );
    
    expect(screen.getByRole('banner')).toHaveClass('custom-header');
  });

  it('renders mobile menu items with correct styles', () => {
    const itemsWithActive = [
      { label: 'Home', href: '/', isActive: true },
      { label: 'Search', href: '/search' },
    ];

    render(<Header navigationItems={itemsWithActive} />);
    
    // Open mobile menu
    fireEvent.click(screen.getByRole('button', { name: /open main menu/i }));
    
    const activeItem = screen.getByRole('link', { name: 'Home' });
    const inactiveItem = screen.getByRole('link', { name: 'Search' });
    
    expect(activeItem).toHaveClass('bg-blue-50', 'border-blue-500', 'text-blue-700');
    expect(inactiveItem).toHaveClass('border-transparent', 'text-gray-500');
  });

  it('renders mobile actions with correct styles', () => {
    const Actions = () => <button>Sign In</button>;
    render(
      <Header
        navigationItems={defaultNavigationItems}
        actions={<Actions />}
      />
    );
    
    // Open mobile menu
    fireEvent.click(screen.getByRole('button', { name: /open main menu/i }));
    
    const mobileActions = screen.getByText('Sign In').closest('div');
    expect(mobileActions?.parentElement).toHaveClass('border-t', 'border-gray-200');
  });

  it('maintains accessibility attributes in mobile view', () => {
    render(<Header navigationItems={defaultNavigationItems} />);
    
    // Open mobile menu
    fireEvent.click(screen.getByRole('button', { name: /open main menu/i }));
    
    expect(screen.getByRole('navigation', { name: /mobile navigation/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close main menu/i }))
      .toBeInTheDocument();
  });
}); 