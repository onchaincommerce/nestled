import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define an array of paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/journal', '/scrapbook', '/date-planner'];

// Define an array of paths that should be accessible only to non-authenticated users
const AUTH_PATHS = ['/login', '/signup', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the user has a passage auth token using multiple methods
  const hasAuthTokenCookie = request.cookies.has('psg_auth_token');
  
  // Also check localStorage via client-side only - middleware can't access localStorage
  // Therefore we fall back to cookie-based auth only for middleware
  const hasAuthToken = hasAuthTokenCookie;
  
  // Add debugging for token status - this will appear in server logs
  console.log(`Path: ${pathname}, Auth token present: ${hasAuthToken}`);
  
  // For protected paths, redirect to login if the user is not authenticated
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path)) && !hasAuthToken) {
    console.log(`Redirecting from ${pathname} to / due to missing auth token`);
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // For auth paths, redirect to dashboard if the user is already authenticated
  if (AUTH_PATHS.includes(pathname) && hasAuthToken) {
    console.log(`Redirecting from ${pathname} to /dashboard due to existing auth token`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
} 