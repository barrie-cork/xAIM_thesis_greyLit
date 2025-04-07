import * as React from 'react';
import { cn } from '../../utils/cn';

interface NavigationItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface HeaderProps {
  logo?: React.ReactNode;
  navigationItems: NavigationItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  navigationItems,
  actions,
  className,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={cn('bg-white shadow-sm', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            {/* Logo */}
            {logo && (
              <div className="flex-shrink-0 flex items-center">
                {logo}
              </div>
            )}
            
            {/* Desktop Navigation */}
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8" aria-label="Main navigation">
              {navigationItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2',
                    'text-sm font-medium',
                    item.isActive
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  )}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Actions and Mobile Menu Button */}
          <div className="flex items-center">
            {/* Actions (e.g., buttons, user menu) */}
            {actions && (
              <div className="hidden sm:flex sm:items-center sm:ml-6">
                {actions}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={toggleMobileMenu}
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">
                {isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
              </span>
              {/* Menu/Close icon */}
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn('sm:hidden', !isMobileMenuOpen && 'hidden')}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="pt-2 pb-3 space-y-1">
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                'block pl-3 pr-4 py-2 border-l-4',
                'text-base font-medium',
                item.isActive
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              )}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
        {/* Mobile actions */}
        {actions && (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="space-y-1">{actions}</div>
          </div>
        )}
      </div>
    </header>
  );
}; 