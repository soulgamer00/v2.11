/**
 * Rate Limiting Utility
 * Prevents spam and abuse by limiting request frequency
 */

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
	message?: string; // Custom error message
}

interface RateLimitStore {
	count: number;
	resetTime: number;
}

// In-memory store (use Redis in production for distributed systems)
const store = new Map<string, RateLimitStore>();

// Cleanup old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of store.entries()) {
		if (value.resetTime < now) {
			store.delete(key);
		}
	}
}, 5 * 60 * 1000);

/**
 * Get client identifier from request
 */
function getClientId(event: { getClientAddress?: () => string; url: { pathname: string } }): string {
	// Try to get IP address, fallback to 'unknown' if not available
	let ip = 'unknown';
	try {
		if (event.getClientAddress) {
			ip = event.getClientAddress();
		}
	} catch (e) {
		// getClientAddress might not be available in all contexts
		ip = 'unknown';
	}
	const path = event.url.pathname;
	// Combine IP and path for more granular rate limiting
	return `${ip}:${path}`;
}

/**
 * Check if request exceeds rate limit
 * @returns null if allowed, error response if rate limited
 */
export function checkRateLimit(
	event: { getClientAddress?: () => string; url: { pathname: string } },
	config: RateLimitConfig
): { status: number; body: { error: string } } | null {
	const clientId = getClientId(event);
	const now = Date.now();
	const entry = store.get(clientId);

	if (!entry || entry.resetTime < now) {
		// Create new entry or reset expired entry
		store.set(clientId, {
			count: 1,
			resetTime: now + config.windowMs
		});
		return null; // Allowed
	}

	// Increment count
	entry.count++;

	if (entry.count > config.maxRequests) {
		// Rate limit exceeded
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		return {
			status: 429,
			body: {
				error: config.message || `เกินอัตราการร้องขอ กรุณาลองใหม่อีกครั้งใน ${retryAfter} วินาที`
			}
		};
	}

	return null; // Allowed
}

/**
 * Rate limit configurations for different endpoints
 */
export const RateLimitConfigs = {
	// Login: 5 attempts per 15 minutes per IP
	LOGIN: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 5,
		message: 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่อีกครั้งใน 15 นาที'
	} as RateLimitConfig,

	// Import: 3 imports per hour per user
	IMPORT: {
		windowMs: 15 * 60 * 1000, // 1 hour
		maxRequests: 10,
		message: 'คุณส่งคำขอ import มากเกินไป กรุณาลองใหม่อีกครั้งใน 1 ชั่วโมง'
	} as RateLimitConfig,

	// Export: 10 exports per hour per user
	EXPORT: {
		windowMs: 15 * 60 * 1000, // 1 hour
		maxRequests: 10,
		message: 'คุณส่งคำขอ export มากเกินไป กรุณาลองใหม่อีกครั้งใน 1 ชั่วโมง'
	} as RateLimitConfig,

	// API endpoints: 100 requests per minute per IP
	API: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 100,
		message: 'คุณส่งคำขอ API มากเกินไป กรุณาลองใหม่อีกครั้งใน 1 นาที'
	} as RateLimitConfig,

	// Form submissions: 20 submissions per minute per IP
	FORM: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 20,
		message: 'คุณส่งฟอร์มมากเกินไป กรุณาลองใหม่อีกครั้งใน 1 นาที'
	} as RateLimitConfig,

	// General: 200 requests per minute per IP
	GENERAL: {
		windowMs: 60 * 1000, // 1 minute
		maxRequests: 200,
		message: 'คุณส่งคำขอมากเกินไป กรุณาลองใหม่อีกครั้งใน 1 นาที'
	} as RateLimitConfig
};

/**
 * Get rate limit config for a specific path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig | null {
	// Login endpoint
	if (pathname === '/login' || pathname.startsWith('/login')) {
		return RateLimitConfigs.LOGIN;
	}

	// Import endpoints
	if (pathname.includes('/import/')) {
		return RateLimitConfigs.IMPORT;
	}

	// Export endpoints
	if (pathname.includes('/export/')) {
		return RateLimitConfigs.EXPORT;
	}

	// API endpoints
	if (pathname.startsWith('/api/')) {
		return RateLimitConfigs.API;
	}

	// Form submissions (POST/PUT/PATCH to non-API routes)
	// This will be handled in the hook

	return null; // No rate limit for this path
}

/**
 * Clear rate limit for a specific client (useful for testing or manual reset)
 */
export function clearRateLimit(clientId: string): void {
	store.delete(clientId);
}

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(
	event: { getClientAddress: () => string; url: { pathname: string } },
	config: RateLimitConfig
): { remaining: number; resetTime: number } | null {
	const clientId = getClientId(event);
	const entry = store.get(clientId);

	if (!entry || entry.resetTime < Date.now()) {
		return {
			remaining: config.maxRequests,
			resetTime: Date.now() + config.windowMs
		};
	}

	return {
		remaining: Math.max(0, config.maxRequests - entry.count),
		resetTime: entry.resetTime
	};
}

