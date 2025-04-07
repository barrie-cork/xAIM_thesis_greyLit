import type { Meta, StoryObj } from '@storybook/react';
import { Header } from './Header';

const meta = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof Header>;

const defaultNavigationItems = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'Search', href: '/search' },
  { label: 'Library', href: '/library' },
  { label: 'Settings', href: '/settings' },
];

const Logo = () => (
  <div className="text-blue-600 font-bold text-xl">Logo</div>
);

const Actions = () => (
  <div className="flex space-x-4">
    <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
      Sign In
    </button>
    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200">
      Register
    </button>
  </div>
);

export const Default: Story = {
  args: {
    navigationItems: defaultNavigationItems,
  },
};

export const WithLogo: Story = {
  args: {
    logo: <Logo />,
    navigationItems: defaultNavigationItems,
  },
};

export const WithActions: Story = {
  args: {
    logo: <Logo />,
    navigationItems: defaultNavigationItems,
    actions: <Actions />,
  },
};

export const WithCustomStyles: Story = {
  args: {
    logo: <Logo />,
    navigationItems: defaultNavigationItems,
    actions: <Actions />,
    className: 'bg-gray-800',
  },
};

export const WithLongNavigation: Story = {
  args: {
    logo: <Logo />,
    navigationItems: [
      ...defaultNavigationItems,
      { label: 'Profile', href: '/profile' },
      { label: 'Messages', href: '/messages' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Help', href: '/help' },
    ],
    actions: <Actions />,
  },
};

export const WithActiveItem: Story = {
  args: {
    logo: <Logo />,
    navigationItems: defaultNavigationItems.map((item) => ({
      ...item,
      isActive: item.label === 'Search',
    })),
    actions: <Actions />,
  },
}; 