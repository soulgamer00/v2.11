import { fail, redirect } from '@sveltejs/kit';
import { validateCredentials, createSession } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import { checkRateLimit, RateLimitConfigs, clearRateLimit } from '$lib/server/rateLimit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		// Apply rate limiting for login attempts
		const rateLimitResult = checkRateLimit(
			{ getClientAddress, url },
			RateLimitConfigs.LOGIN
		);

		if (rateLimitResult) {
			return fail(429, { error: rateLimitResult.body.error });
		}

		const data = await request.formData();
		const username = data.get('username')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
		}

		// Validate credentials
		const user = await validateCredentials(username, password);

		if (!user) {
			return fail(401, { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
		}

		// Clear rate limit on successful login
		const clientId = `${getClientAddress()}:${url.pathname}`;
		clearRateLimit(clientId);

		// Create session
		const sessionId = await createSession(user.id);

		// Set cookie
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Log audit (don't await - let it run in background to avoid blocking redirect)
		logAudit(user.id, AuditActions.LOGIN, AuditResources.SESSION).catch((err) => {
			console.error('Failed to log audit:', err);
		});

		throw redirect(302, '/dashboard');
	}
};

