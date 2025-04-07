import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar, type SidebarProps, type SidebarItem } from './Sidebar';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const meta = {
  title: 'Components/Navigation/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-screen pt-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultItems = [
  {
    id: 'home',
    label: 'Home',
    icon: <HomeIcon />,
    href: '/',
    isActive: true,
  },
  {
    id: 'search',
    label: 'Search',
    icon: <MagnifyingGlassIcon />,
    href: '/search',
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
        icon: <DocumentTextIcon />,
        href: '/library/documents',
      },
      {
        id: 'collections',
        label: 'Collections',
        icon: <UserGroupIcon />,
        href: '/library/collections',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <ChartBarIcon />,
    href: '/analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Cog6ToothIcon />,
    href: '/settings',
  },
] satisfies SidebarItem[];

const SidebarWithState = ({ items, ...props }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <Sidebar
      items={items}
      isCollapsed={isCollapsed}
      onCollapse={() => setIsCollapsed(!isCollapsed)}
      {...props}
    />
  );
};

export const Default: Story = {
  args: {
    items: defaultItems,
  },
  render: (args) => <SidebarWithState {...args} />,
};

export const InitiallyCollapsed: Story = {
  args: {
    items: defaultItems,
  },
  render: () => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
      <Sidebar
        items={defaultItems}
        isCollapsed={isCollapsed}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
      />
    );
  },
};

export const WithoutIcons: Story = {
  args: {
    items: defaultItems.map(({ icon, ...item }) => item),
  },
  render: (args) => <SidebarWithState {...args} />,
};

export const WithCustomHeight: Story = {
  args: {
    items: defaultItems,
    headerHeight: '5rem',
    className: 'border-t',
  },
  render: (args) => <SidebarWithState {...args} />,
};

export const WithNestedGroups: Story = {
  args: {
    items: [
      ...defaultItems.slice(0, 2),
      {
        ...defaultItems[2],
        children: [
          ...defaultItems[2].children!,
          {
            id: 'advanced',
            label: 'Advanced',
            icon: <Cog6ToothIcon />,
            href: '/library/advanced',
            children: [
              {
                id: 'reports',
                label: 'Reports',
                href: '/library/advanced/reports',
              },
              {
                id: 'exports',
                label: 'Exports',
                href: '/library/advanced/exports',
              },
            ],
          },
        ],
      },
      ...defaultItems.slice(3),
    ],
  },
  render: (args) => <SidebarWithState {...args} />,
}; 