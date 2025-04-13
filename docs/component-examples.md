# Component Usage Examples

This document provides practical examples of how to use the UI components in the Grey Literature Search App. These examples serve as a reference for implementing consistent UI patterns across the application.

## Table of Contents

1. [Authentication Forms](#authentication-forms)
2. [Search Interface](#search-interface)
3. [Results Display](#results-display)
4. [Notifications and Feedback](#notifications-and-feedback)
5. [Layout Patterns](#layout-patterns)

## Authentication Forms

### Login Form

The login form uses the standard form layout with Input and Button components:

```tsx
import { Button, Input, Label } from '@/components/ui';
import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle={
        <>
          Or{' '}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            create a new account
          </Link>
        </>
      }
    >
      <form className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              required
              className="mt-1 block w-full"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              className="mt-1 block w-full"
            />
          </div>
        </div>
        
        {/* Error message container (shown conditionally) */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          variant="default"
          size="lg"
        >
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}
```

### Registration Form

The registration form follows the same pattern with additional fields:

```tsx
<AuthLayout
  title="Create a new account"
  subtitle={
    <>
      Or{' '}
      <Link
        href="/auth/login"
        className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
      >
        sign in to your account
      </Link>
    </>
  }
>
  <form className="space-y-6">
    {/* Form fields */}
    
    <Button
      type="submit"
      className="w-full"
      variant="default"
      size="lg"
    >
      Create Account
    </Button>
  </form>
</AuthLayout>
```

### Success Message

For confirmation or success messages:

```tsx
<div className="p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
  <div className="flex items-center justify-center mb-4 text-green-600">
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>
  <h3 className="text-xl font-semibold text-center text-green-800">Account Created Successfully</h3>
  <p className="mt-2 text-center text-sm text-green-700">
    Your account has been created successfully and is ready to use.
  </p>
  <div className="mt-6 flex justify-center">
    <Button
      type="button"
      variant="default"
      size="lg"
      onClick={() => router.push('/auth/login')}
    >
      Go to Login
    </Button>
  </div>
</div>
```

## Search Interface

### Search Form

```tsx
<div className="space-y-6">
  <div className="bg-white p-6 rounded-lg border shadow-sm">
    <h2 className="text-xl font-semibold mb-4">Search Parameters</h2>
    
    <div className="space-y-4">
      <div>
        <Label htmlFor="query">Search Query</Label>
        <Input
          id="query"
          placeholder="Enter your search terms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fileType">File Type</Label>
          <Select
            id="fileType"
            value={fileType}
            onValueChange={setFileType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select file type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="doc">Word Document</SelectItem>
              <SelectItem value="html">Web Page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder="e.g., example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
      </div>
    </div>
    
    <div className="mt-6 flex justify-end space-x-3">
      <Button variant="outline" onClick={resetForm}>
        Reset
      </Button>
      <Button onClick={handleSearch}>
        Search
      </Button>
    </div>
  </div>
</div>
```

## Results Display

### Search Results List

```tsx
<div className="space-y-4">
  <h2 className="text-2xl font-bold">Search Results</h2>
  
  {results.length === 0 ? (
    <div className="bg-gray-50 p-8 text-center rounded-lg border">
      <p className="text-gray-600">No results found. Try adjusting your search terms.</p>
    </div>
  ) : (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id}>
          <CardHeader>
            <CardTitle>
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {result.title}
              </a>
            </CardTitle>
            <CardDescription>{result.url}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{result.snippet}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              {result.fileType} • {new Date(result.date).toLocaleDateString()}
            </div>
            <Button variant="outline" size="sm">
              Save
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )}
</div>
```

## Notifications and Feedback

### Toast Notifications

```tsx
// Success toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
  variant: "success",
});

// Error toast
toast({
  title: "Error",
  description: "There was a problem with your request.",
  variant: "destructive",
});
```

### Loading States

```tsx
// Loading button
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>

// Loading screen
{isLoading && (
  <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
    <div className="flex flex-col items-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-gray-700">Loading results...</p>
    </div>
  </div>
)}
```

## Layout Patterns

### Page Layout

```tsx
<div className="min-h-screen flex flex-col">
  {/* Header */}
  <header className="bg-white border-b sticky top-0 z-10">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">Grey Literature Search</h1>
      <nav className="flex items-center space-x-4">
        <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
          Dashboard
        </Link>
        <Link href="/search-builder" className="text-gray-700 hover:text-blue-600">
          Search Builder
        </Link>
        <LogoutButton />
      </nav>
    </div>
  </header>

  {/* Main content */}
  <main className="flex-grow container mx-auto px-4 py-8">
    {children}
  </main>

  {/* Footer */}
  <footer className="bg-gray-50 border-t py-6">
    <div className="container mx-auto px-4 text-center text-gray-600">
      <p>© {new Date().getFullYear()} Grey Literature Search App. All rights reserved.</p>
    </div>
  </footer>
</div>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Sidebar */}
  <div className="lg:col-span-1">
    <div className="bg-white p-6 rounded-lg border shadow-sm sticky top-24">
      <h2 className="text-xl font-semibold mb-4">Filters</h2>
      {/* Filters content */}
    </div>
  </div>
  
  {/* Main content */}
  <div className="lg:col-span-2">
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Results</h2>
      {/* Results content */}
    </div>
  </div>
</div>
```

## Best Practices Reminder

1. Always use the UI components from the component library
2. Maintain consistent spacing using Tailwind's spacing utilities
3. Follow the established patterns for forms, cards, and other UI elements
4. Ensure all interactive elements are accessible
5. Test all interfaces on multiple screen sizes
