import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  isActive?: boolean;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  isCollapsed?: boolean;
  onCollapse?: () => void;
  className?: string;
  headerHeight?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  isCollapsed = false,
  onCollapse,
  className,
  headerHeight = '4rem'
}) => {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (itemId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderSidebarItem = (item: SidebarItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openGroups[item.id];

    return (
      <li key={item.id} className="w-full">
        <a
          href={item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleGroup(item.id);
            }
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors',
            item.isActive && 'bg-gray-100 text-primary-600 font-medium',
            isCollapsed && 'justify-center px-2',
            depth > 0 && 'ml-4'
          )}
          aria-current={item.isActive ? 'page' : undefined}
          role={hasChildren ? 'button' : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
        >
          {item.icon && (
            <span className={cn('h-5 w-5', isCollapsed && 'h-6 w-6')}>
              {item.icon}
            </span>
          )}
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasChildren && (
                <ChevronRightIcon
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isOpen && 'transform rotate-90'
                  )}
                />
              )}
            </>
          )}
        </a>
        {hasChildren && !isCollapsed && isOpen && (
          <ul className="mt-1 space-y-1">
            {item.children.map(child => renderSidebarItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
      style={{ height: `calc(100vh - ${headerHeight})` }}
      aria-label="Sidebar navigation"
    >
      <div className="flex items-center justify-end p-2 border-b border-gray-200">
        <button
          onClick={onCollapse}
          className="p-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {items.map(item => renderSidebarItem(item))}
        </ul>
      </nav>
    </aside>
  );
}; 