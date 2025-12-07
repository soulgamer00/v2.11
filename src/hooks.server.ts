import { getUserFromSession } from '$lib/server/auth';
import { checkRateLimit, getRateLimitConfig, RateLimitConfigs } from '$lib/server/rateLimit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { json } from '@sveltejs/kit';

// Rate limiting hook
const rateLimitHandle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const method = event.request.method;

	// Skip rate limiting for GET requests to static assets
	if (method === 'GET' && (path.startsWith('/_app/') || path.startsWith('/favicon') || path.startsWith('/manifest'))) {
		return resolve(event);
	}

	// Get rate limit config for this path
	const config = getRateLimitConfig(path);

	// Apply rate limiting for POST/PUT/PATCH/DELETE requests
	if (config && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		const rateLimitResult = checkRateLimit(event, config);
		if (rateLimitResult) {
			return json(rateLimitResult.body, { status: rateLimitResult.status });
		}
	}

	// Apply general rate limiting for all requests (except static assets)
	if (!config && method !== 'GET') {
		const generalConfig = RateLimitConfigs.GENERAL;
		const rateLimitResult = checkRateLimit(event, generalConfig);
		if (rateLimitResult) {
			return json(rateLimitResult.body, { status: rateLimitResult.status });
		}
	}

	return resolve(event);
};

// Authentication hook
const authHandle: Handle = async ({ event, resolve }) => {
	// Get user from session
	const user = await getUserFromSession(event);
	event.locals.user = user;

	return resolve(event);
};

// Protected routes hook
const protectedRoutesHandle: Handle = async ({ event, resolve }) => {
	const user = event.locals.user;
	const path = event.url.pathname;

	// Public routes
	const publicRoutes = ['/login', '/'];

	// If not logged in and trying to access protected route
	if (!user && !publicRoutes.some((route) => path.startsWith(route))) {
		return new Response(null, {
			status: 302,
			headers: {
				location: '/login'
			}
		});
	}

	// If logged in and trying to access login page, redirect to dashboard
	if (user && path === '/login') {
		return new Response(null, {
			status: 302,
			headers: {
				location: '/dashboard'
			}
		});
	}

	return resolve(event);
};

export const handle = sequence(rateLimitHandle, authHandle, protectedRoutesHandle);




