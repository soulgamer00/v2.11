import { json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const sessionId = cookies.get('session');
	const user = locals.user;

	// Log audit before deleting session (non-blocking)
	if (user) {
		logAudit(user.id, AuditActions.LOGOUT, AuditResources.SESSION).catch((err) => {
			console.error('Failed to log audit:', err);
		});
	}

	if (sessionId) {
		await deleteSession(sessionId);
	}

	cookies.delete('session', { path: '/' });

	// Return JSON response instead of redirect
	// Client-side will handle the redirect
	return json({ success: true, redirect: '/login' });
};

