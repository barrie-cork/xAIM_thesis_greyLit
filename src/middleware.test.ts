import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simplified middleware for testing
 * Removes the logger dependency which is causing issues in tests
 */
export async function testMiddleware(request: NextRequest) {
  try {
    // Create a response object that we can modify
    const response = NextResponse.next();

    // Create a Supabase client for the middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // This is used for setting cookies during auth refreshes
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            });
          },
        },
      }
    );

    // Refresh the session if it exists
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Set cache headers
    response.headers.set('x-middleware-cache', 'no-cache');

    // Protected routes
    if (request.nextUrl.pathname.startsWith('/search-builder') ||
        request.nextUrl.pathname.startsWith('/saved-searches') ||
        request.nextUrl.pathname.startsWith('/search-results') ||
        request.nextUrl.pathname.startsWith('/review')) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Auth routes - redirect to home page if already logged in
    if (request.nextUrl.pathname.startsWith('/auth/login') ||
        request.nextUrl.pathname.startsWith('/auth/register')) {
      if (session) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response;
  } catch (error) {
    // If any error occurs in middleware, log it but let the request continue
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}
