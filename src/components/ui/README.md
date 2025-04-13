# UI Component Library

This directory contains the UI component library for the Grey Literature Search App. These components provide a consistent design system across the application.

## Component Overview

The component library includes:

- **Button**: For user interactions and actions
- **Input**: For text input fields
- **Label**: For form labels
- **Card**: For containing related content
- **Select**: For dropdown selection
- **Checkbox**: For boolean input
- **Dialog**: For modal dialogs
- **Tabs**: For tabbed interfaces
- **Toast**: For notifications

## Usage Guidelines

1. **Import from the UI Library**:
   ```tsx
   import { Button, Input, Label } from '@/components/ui';
   ```

2. **Use Component Props**:
   Each component has specific props for customization. Refer to the component files or Storybook documentation for details.

3. **Styling**:
   Components use Tailwind CSS for styling. Use the `className` prop to add additional styles, but try to maintain consistency with the design system.

4. **Composition**:
   Some components are designed to be used together (e.g., Card with CardHeader, CardContent, etc.).

## Adding New Components

When adding a new component:

1. Create a new file in this directory
2. Export the component from `index.ts`
3. Add documentation in the component file using JSDoc comments
4. Create a Storybook story for the component
5. Update the UI documentation in the `docs` directory

## Documentation

For detailed documentation on using these components, refer to:

- `docs/ui-guidelines.md`: General UI guidelines and principles
- `docs/component-examples.md`: Examples of component usage
- `docs/storybook-guide.md`: Guide for using Storybook with these components

## Best Practices

1. Use the existing components instead of creating new ones for similar purposes
2. Maintain consistency in styling and behavior
3. Ensure all components are accessible
4. Test components in different contexts and screen sizes
5. Document any new components or significant changes
