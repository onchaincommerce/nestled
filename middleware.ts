import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define an array of paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/journal', '/scrapbook', '/date-planner', '/welcome'];

// Define an array of paths that should be accessible only to non-authenticated users
const AUTH_PATHS = ['/login', '/signup', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the user has a passage auth token
  const hasAuthToken = request.cookies.has('psg_auth_token');
  
  // For protected paths, redirect to login if the user is not authenticated
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path)) && !hasAuthToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // For auth paths, redirect to welcome page if the user is already authenticated
  if (AUTH_PATHS.includes(pathname) && hasAuthToken) {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }
  
  return NextResponse.next();
} 