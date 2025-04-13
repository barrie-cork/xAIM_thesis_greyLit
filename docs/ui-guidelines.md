# UI Guidelines and Component Documentation

## Overview

This document provides guidelines and documentation for the UI components used in the Grey Literature Search App. Following these guidelines will ensure consistency across the application and make development more efficient.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Library](#component-library)
5. [Layout Guidelines](#layout-guidelines)
6. [Form Elements](#form-elements)
7. [Best Practices](#best-practices)

## Design Principles

The UI design follows these core principles:

- **Consistency**: Use the same components, patterns, and styles throughout the application
- **Simplicity**: Keep interfaces clean and focused on the task at hand
- **Accessibility**: Ensure all components are accessible to all users
- **Responsiveness**: Design for all screen sizes and devices

## Color System

The application uses a consistent color palette based on Tailwind CSS:

- **Primary**: Blue (`blue-600`) - Used for primary actions, links, and emphasis
- **Secondary**: Gray (`gray-200`) - Used for secondary actions and UI elements
- **Background**: White/Light Gray gradient - Used for page backgrounds
- **Text**: Dark Gray (`gray-900`) for headings, Medium Gray (`gray-700`) for body text
- **Accent**: Various blues for highlights and focus states
- **Error**: Red (`red-600`) for error states and validation messages
- **Success**: Green (`green-600`) for success states and confirmations

## Typography

Typography follows a hierarchical system:

- **Headings**:
  - H1: `text-4xl md:text-5xl font-bold text-gray-900`
  - H2: `text-3xl font-bold text-gray-900`
  - H3: `text-xl font-semibold text-gray-900`
  
- **Body Text**:
  - Regular: `text-base text-gray-700`
  - Small: `text-sm text-gray-600`
  
- **Labels and Form Elements**:
  - Labels: `text-sm font-medium text-gray-700`
  - Placeholder: `text-gray-500`

## Component Library

The application uses a custom component library built with Tailwind CSS. All components are located in `src/components/ui/`.

### Core Components

#### Button

The Button component (`src/components/ui/button.tsx`) is used for all interactive actions.

**Variants**:
- `default`: Primary blue button
- `secondary`: Gray button for secondary actions
- `outline`: Outlined button with transparent background
- `destructive`: Red button for destructive actions
- `ghost`: Text-only button with hover state
- `link`: Text link style

**Sizes**:
- `default`: Standard size
- `sm`: Small size
- `lg`: Large size
- `icon`: Square button for icons

**Usage Example**:
```tsx
import { Button } from '@/components/ui';

// Primary button
<Button>Submit</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Large primary button
<Button size="lg" variant="default">Create Account</Button>

// Outline button with icon
<Button variant="outline">
  <Icon className="mr-2 h-4 w-4" />
  Settings
</Button>
```

#### Input

The Input component (`src/components/ui/input.tsx`) is used for all text input fields.

**Features**:
- Support for labels
- Error state handling
- Helper text
- Start and end icons
- Loading state

**Usage Example**:
```tsx
import { Input } from '@/components/ui';

// Basic input
<Input 
  id="email"
  type="email"
  placeholder="Enter your email"
  required
/>

// Input with label and error
<Input
  id="password"
  type="password"
  label="Password"
  error="Password must be at least 8 characters"
  required
/>
```

#### Label

The Label component (`src/components/ui/label.tsx`) is used for form labels.

**Usage Example**:
```tsx
import { Label } from '@/components/ui';

<Label htmlFor="email" className="text-gray-700 font-medium">
  Email Address
  {required && <span className="text-red-500 ml-1">*</span>}
</Label>
```

### Layout Components

#### Card

The Card component is used for containing related content.

**Usage Example**:
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Layout Guidelines

### Page Structure

Pages should follow this general structure:

1. **Header**: Contains navigation and user actions
2. **Main Content**: Primary content area
3. **Footer**: Contains secondary information and links

### Spacing

Use Tailwind's spacing utilities consistently:

- `space-y-4` for vertical spacing between elements
- `space-x-4` for horizontal spacing between elements
- `p-4` to `p-8` for padding within containers
- `m-4` to `m-8` for margins around containers

### Responsive Design

- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`)
- Design mobile-first, then add breakpoints for larger screens
- Test all interfaces on multiple screen sizes

## Form Elements

### Form Structure

Forms should follow this structure:

```tsx
<form className="space-y-6">
  <div className="space-y-4">
    {/* Form fields go here */}
  </div>
  
  {/* Error message container */}
  {error && (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
      <p className="text-sm text-red-600">{error}</p>
    </div>
  )}
  
  {/* Form actions */}
  <Button type="submit" className="w-full">Submit</Button>
</form>
```

### Validation

- Use inline validation where possible
- Show error messages below the relevant field
- Use red color (`text-red-600`, `border-red-500`) for error states

## Best Practices

1. **Import Components from UI Library**:
   Always import components from the UI library rather than creating new ones:
   ```tsx
   // Correct
   import { Button, Input } from '@/components/ui';
   
   // Incorrect
   import { Button } from '../Button/Button';
   ```

2. **Consistent Styling**:
   Use the predefined Tailwind classes and avoid custom CSS where possible.

3. **Component Props**:
   Use the defined props for components and avoid overriding styles with className unless necessary.

4. **Responsive Design**:
   Always consider mobile views and use responsive classes.

5. **Accessibility**:
   Ensure all interactive elements have proper ARIA attributes and keyboard navigation.

6. **Testing UI Components**:
   When adding new UI components, consider adding them to Storybook for documentation and testing.

## Adding New Components

When adding new components to the UI library:

1. Create the component in `src/components/ui/`
2. Export it from `src/components/ui/index.ts`
3. Document the component in this guide
4. Consider adding a Storybook story for the component

## References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
