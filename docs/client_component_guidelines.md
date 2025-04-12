# Client Component Guidelines

This document provides guidelines for creating and using client components in the Next.js application, with a focus on the "use client" directive.

## Understanding Server and Client Components

Next.js 13+ uses a hybrid model with both server and client components:

- **Server Components**: Render on the server and don't include client-side interactivity
- **Client Components**: Include client-side interactivity and are hydrated in the browser

## When to Use "use client" Directive

Add the `"use client"` directive at the top of your file when your component:

1. Uses React hooks (`useState`, `useEffect`, `useContext`, etc.)
2. Uses browser-only APIs (`window`, `document`, `localStorage`, etc.)
3. Handles user events (`onClick`, `onChange`, etc.)
4. Uses client-side routing (`useRouter`, `Link` with client-side navigation)
5. Uses client-side libraries that depend on the DOM

Example:
```tsx
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MyClientComponent() {
  const [count, setCount] = useState(0);
  const router = useRouter();
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

## Common Hooks Requiring "use client"

If your component uses any of these hooks, it must be a client component:

- `useState`
- `useEffect`
- `useContext`
- `useReducer`
- `useCallback`
- `useMemo`
- `useRef`
- `useRouter` (from 'next/navigation')
- `useSearchParams` (from 'next/navigation')
- `usePathname` (from 'next/navigation')
- Custom hooks that use any of the above

## Client Component Checklist

When creating a new component, ask yourself:

- Does it need to handle user interactions?
- Does it need to maintain state?
- Does it need to use browser APIs?
- Does it need to use client-side routing?

If the answer to any of these is "yes", add the `"use client"` directive.

## Best Practices

1. **Place the directive at the very top of the file**:
   ```tsx
   "use client"
   
   // Imports and component code below
   ```

2. **Keep server and client components separate**:
   - Don't mix server and client logic in the same component
   - Create separate components for server and client concerns

3. **Use client components sparingly**:
   - Server components have better performance
   - Only use client components when necessary

4. **Client components can import server components, but not vice versa**:
   - A client component can render a server component
   - A server component cannot render a client component directly

5. **Create client component boundaries**:
   - Create wrapper client components that handle interactivity
   - Keep most of your UI as server components

## Components That Need "use client"

The following components in our application need the "use client" directive:

### Authentication Components
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `PasswordResetForm.tsx`
- Auth-related pages (`login.tsx`, `register.tsx`, etc.)

### Form Components
- `Input.tsx`
- `Label.tsx`
- `Button.tsx`
- `Select.tsx`
- `Checkbox.tsx`
- Any form component with validation or state

### Search Components
- `SearchBuilder.tsx`
- `SaveSearchDialog.tsx`
- `SearchResults.tsx`
- Any component that handles search state or user interactions

### Review Interface Components
- All components that handle tagging, notes, or user interactions

## Example: Converting a Component to Client Component

### Before:
```tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MyComponent() {
  const [value, setValue] = useState('');
  const router = useRouter();
  
  const handleSubmit = () => {
    // Do something with value
    router.push('/success');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### After:
```tsx
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MyComponent() {
  const [value, setValue] = useState('');
  const router = useRouter();
  
  const handleSubmit = () => {
    // Do something with value
    router.push('/success');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Troubleshooting

If you encounter errors like:

```
Error: useState can only be used in Client Components. Add the "use client" directive at the top of the file to use it.
```

or

```
Error: useRouter can only be used in Client Components. Add the "use client" directive at the top of the file to use it.
```

Add the `"use client"` directive at the very top of your file, before any imports.
