import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';

const meta = {
  title: 'Components/Label',
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: 'Email Address',
  },
};

export const Required: Story = {
  args: {
    children: 'Password',
    required: true,
  },
};

export const WithError: Story = {
  args: {
    children: 'Username',
    error: true,
  },
};

export const CustomClassName: Story = {
  args: {
    children: 'Custom Label',
    className: 'text-blue-500 text-lg',
  },
}; 