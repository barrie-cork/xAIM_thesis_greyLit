# Storybook Guide

This guide explains how to use Storybook for developing and documenting UI components in the Grey Literature Search App.

## What is Storybook?

Storybook is a tool for developing UI components in isolation. It makes building stunning UIs organized and efficient by allowing you to:

- Build components in isolation without worrying about application logic
- Test components in different states by changing props
- Document components for reuse
- Automatically detect and prevent UI bugs

## Setting Up Storybook

If Storybook is not already set up in the project, follow these steps:

1. Install Storybook:

```bash
npx storybook@latest init
```

2. Start Storybook:

```bash
npm run storybook
```

## Creating Stories

Stories are a way to showcase different states of a component. Here's how to create stories for our UI components:

### Basic Story Structure

Create a file with the `.stories.tsx` extension next to your component file:

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default button
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
};

// Secondary button
export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
};

// Outline button
export const Outline: Story = {
  args: {
    children: 'Button',
    variant: 'outline',
  },
};

// Destructive button
export const Destructive: Story = {
  args: {
    children: 'Button',
    variant: 'destructive',
  },
};

// Small button
export const Small: Story = {
  args: {
    children: 'Button',
    size: 'sm',
  },
};

// Large button
export const Large: Story = {
  args: {
    children: 'Button',
    size: 'lg',
  },
};

// Icon button
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4"
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
        GitHub
      </>
    ),
  },
};

// Disabled button
export const Disabled: Story = {
  args: {
    children: 'Button',
    disabled: true,
  },
};

// Loading button
export const Loading: Story = {
  args: {
    children: 'Loading',
    disabled: true,
  },
  render: (args) => (
    <Button {...args}>
      <svg
        className="mr-2 h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading
    </Button>
  ),
};
```

### Form Component Stories

For form components like Input, create stories that show different states:

```tsx
// Input.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

// Default input
export const Default: Story = {
  args: {
    placeholder: 'Enter text',
  },
};

// With label
export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

// With error
export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    error: 'Password must be at least 8 characters',
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};
```

## Documenting Components

Use JSDoc comments to document your components. These comments will be displayed in Storybook:

```tsx
/**
 * Button component for user interactions.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg">Click me</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    // Component implementation
  }
);
```

## Component Controls

Storybook allows you to interact with component props using controls. Define them in the `argTypes` section:

```tsx
argTypes: {
  variant: {
    control: 'select',
    options: ['default', 'secondary', 'outline', 'destructive', 'ghost', 'link'],
    description: 'The visual style of the button',
    table: {
      defaultValue: { summary: 'default' },
    },
  },
  size: {
    control: 'select',
    options: ['default', 'sm', 'lg', 'icon'],
    description: 'The size of the button',
    table: {
      defaultValue: { summary: 'default' },
    },
  },
  disabled: {
    control: 'boolean',
    description: 'Whether the button is disabled',
  },
},
```

## Component Composition

For complex components that are composed of multiple parts (like Card with CardHeader, CardContent, etc.), create stories that show the composition:

```tsx
// Card.stories.tsx
export const CompleteExample: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};
```

## Testing in Storybook

Storybook can be used for visual testing. You can:

1. Check how components look in different states
2. Test responsive behavior using the viewport addon
3. Verify accessibility using the a11y addon

## Best Practices

1. **Create stories for all UI components**: This ensures comprehensive documentation
2. **Show different states**: Include stories for different props, states (loading, error, etc.)
3. **Include documentation**: Use JSDoc comments and descriptions in argTypes
4. **Group related components**: Use the title property to organize components (e.g., 'UI/Buttons', 'UI/Forms')
5. **Test accessibility**: Use the a11y addon to ensure components are accessible

## Resources

- [Storybook Documentation](https://storybook.js.org/docs/react/get-started/introduction)
- [Writing Stories](https://storybook.js.org/docs/react/writing-stories/introduction)
- [Controls](https://storybook.js.org/docs/react/essentials/controls)
- [Accessibility Testing](https://storybook.js.org/docs/react/writing-tests/accessibility-testing)
