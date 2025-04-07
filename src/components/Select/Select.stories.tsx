import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof Select>;

const defaultOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
];

export const Default: Story = {
  args: {
    options: defaultOptions,
    placeholder: 'Select a framework',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    placeholder: 'Select a framework',
  },
};

export const Required: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    required: true,
    placeholder: 'Select a framework',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    helperText: 'Choose your preferred JavaScript framework',
    placeholder: 'Select a framework',
  },
};

export const WithError: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    error: 'Please select a framework',
    placeholder: 'Select a framework',
  },
};

export const Loading: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    isLoading: true,
    placeholder: 'Loading frameworks...',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Framework',
    options: defaultOptions,
    disabled: true,
    placeholder: 'Select a framework',
  },
};

export const WithDisabledOptions: Story = {
  args: {
    label: 'Framework',
    options: [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue', disabled: true },
      { value: 'angular', label: 'Angular' },
      { value: 'svelte', label: 'Svelte', disabled: true },
    ],
    placeholder: 'Select a framework',
  },
}; 