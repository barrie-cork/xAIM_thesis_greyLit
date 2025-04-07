import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';
import { HomeIcon, BookOpenIcon } from '@heroicons/react/24/outline';

describe('Sidebar', () => {
  const defaultItems = [
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon />,
      href: '/',
      isActive: true,
    },
    {
      id: 'library',
      label: 'Library',
      icon: <BookOpenIcon />,
      href: '/library',
      children: [
        {
          id: 'documents',
          label: 'Documents',
          href: '/library/documents',
        },
      ],
    },
  ];

  it('renders all navigation items', () => {
    render(<Sidebar items={defaultItems} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('marks active item correctly', () => {
    render(<Sidebar items={defaultItems} />);
    
    const activeLink = screen.getByText('Home').closest('a');
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('toggles collapse state when button is clicked', () => {
    const onCollapse = vi.fn();
    render(<Sidebar items={defaultItems} onCollapse={onCollapse} />);
    
    const collapseButton = screen.getByLabelText('Collapse sidebar');
    fireEvent.click(collapseButton);
    
    expect(onCollapse).toHaveBeenCalled();
  });

  it('shows correct button label based on collapsed state', () => {
    const { rerender } = render(
      <Sidebar items={defaultItems} isCollapsed={false} />
    );
    
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
    
    rerender(<Sidebar items={defaultItems} isCollapsed={true} />);
    
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('toggles nested items when parent is clicked', () => {
    render(<Sidebar items={defaultItems} />);
    
    const libraryItem = screen.getByText('Library');
    fireEvent.click(libraryItem);
    
    expect(screen.getByText('Documents')).toBeInTheDocument();
    
    fireEvent.click(libraryItem);
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();
  });

  it('hides item labels when collapsed', () => {
    const { rerender } = render(
      <Sidebar items={defaultItems} isCollapsed={false} />
    );
    
    expect(screen.getByText('Home')).toBeVisible();
    expect(screen.getByText('Library')).toBeVisible();
    
    rerender(<Sidebar items={defaultItems} isCollapsed={true} />);
    
    expect(screen.queryByText('Home')).not.toBeVisible();
    expect(screen.queryByText('Library')).not.toBeVisible();
  });

  it('applies custom header height', () => {
    render(<Sidebar items={defaultItems} headerHeight="5rem" />);
    
    const sidebar = screen.getByLabelText('Sidebar navigation');
    expect(sidebar).toHaveStyle({ height: 'calc(100vh - 5rem)' });
  });

  it('applies custom className', () => {
    render(<Sidebar items={defaultItems} className="custom-class" />);
    
    const sidebar = screen.getByLabelText('Sidebar navigation');
    expect(sidebar).toHaveClass('custom-class');
  });
}); 