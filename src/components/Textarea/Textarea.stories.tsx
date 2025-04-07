import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Message',
    placeholder: 'Enter your message',
  },
};

export const Required: Story = {
  args: {
    label: 'Message',
    required: true,
    placeholder: 'Enter your message',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Message',
    helperText: 'Please provide a detailed description',
    placeholder: 'Enter your message',
  },
};

export const WithError: Story = {
  args: {
    label: 'Message',
    error: 'Message is required',
    placeholder: 'Enter your message',
  },
};

export const WithCharacterCount: Story = {
  args: {
    label: 'Message',
    showCharacterCount: true,
    value: 'Hello, World!',
    placeholder: 'Enter your message',
  },
};

export const WithMaxLength: Story = {
  args: {
    label: 'Message',
    maxLength: 100,
    value: 'This is a message that will show the character count because maxLength is set.',
    placeholder: 'Enter your message (max 100 characters)',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Message',
    disabled: true,
    value: 'This textarea is disabled',
    placeholder: 'Enter your message',
  },
};

export const CustomRows: Story = {
  args: {
    label: 'Message',
    rows: 6,
    placeholder: 'This textarea has 6 rows',
  },
};

export const NoResize: Story = {
  args: {
    label: 'Message',
    resize: 'none',
    placeholder: 'This textarea cannot be resized',
  },
};

export const HorizontalResize: Story = {
  args: {
    label: 'Message',
    resize: 'horizontal',
    placeholder: 'This textarea can only be resized horizontally',
  },
};

export const BothResize: Story = {
  args: {
    label: 'Message',
    resize: 'both',
    placeholder: 'This textarea can be resized in both directions',
  },
}; 