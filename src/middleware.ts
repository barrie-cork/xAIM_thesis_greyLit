import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
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

    // Create a response object that we can modify
    const res = NextResponse.next();

    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient({
      req: request,
      res,
    });

    // Refresh the session if it exists
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Track request timing
    const start = Date.now();

    // Log request completion with timing
    const response = NextResponse.next();
    
    response.headers.set('x-middleware-cache', 'no-cache');
    
    // Add timing metrics
    const durationMs = Date.now() - start;
    logger.debug({ 
      durationMs,
      statusCode: response.status,
    }, `HTTP ${request.method} ${new URL(request.url).pathname} completed in ${durationMs}ms`);

    // Protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/search') ||
        request.nextUrl.pathname.startsWith('/review')) {
      if (!session) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Auth routes - redirect to dashboard if already logged in
    if (request.nextUrl.pathname.startsWith('/auth/login') ||
        request.nextUrl.pathname.startsWith('/auth/register')) {
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
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
    '/dashboard/:path*',
    '/search/:path*',
    '/review/:path*',
    '/auth/:path*',
  ],
} 