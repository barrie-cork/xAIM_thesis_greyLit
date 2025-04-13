import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestLogger } from './utils/logger';

/**
 * Middleware runs on every request to the application
 * It's used for handling authentication and logging requests
 */
export async function middleware(request: NextRequest) {
  try {
    // Create a logger instance with request context
    const logger = requestLogger(request);

    // Get IP address from forwarded headers (if available)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Log incoming request
    logger.info({
      url: request.url,
      method: request.method,
      clientIp,
    }, `HTTP ${request.method} ${new URL(request.url).pathname}`);

    // Track request timing
    const start = Date.now();

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

    // Add timing metrics
    const durationMs = Date.now() - start;
    logger.debug({
      durationMs,
      statusCode: response.status,
    }, `HTTP ${request.method} ${new URL(request.url).pathname} completed in ${durationMs}ms`);

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

export const config = {
  matcher: [
    '/search-builder',
    '/saved-searches',
    '/search-results',
    '/review/:path*',
    '/auth/:path*',
  ],
}