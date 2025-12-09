import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

const SESSION_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
	id: string;
	username: string;
	fullName: string;
	role: 'SUPERADMIN' | 'ADMIN' | 'USER';
	hospitalId: number | null;
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
	const sessionId = generateSessionId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION);

	await prisma.session.create({
		data: {
			id: sessionId,
			userId,
			expiresAt
		}
	});

	return sessionId;
}

/**
 * Validate credentials and return user if valid
 */
export async function validateCredentials(
	username: string,
	password: string
): Promise<SessionUser | null> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: {
			id: true,
			username: true,
			fullName: true,
			role: true,
			hospitalId: true,
			passwordHash: true,
			isActive: true
		}
	});

	if (!user || !user.isActive) {
		return null;
	}

	const isValidPassword = await bcrypt.compare(password, user.passwordHash);
	if (!isValidPassword) {
		return null;
	}

	const { passwordHash: _, isActive: __, ...sessionUser } = user;
	return sessionUser;
}

/**
 * Get user from session cookie
 */
export async function getUserFromSession(event: RequestEvent): Promise<SessionUser | null> {
	const sessionId = event.cookies.get('session');
	if (!sessionId) {
		return null;
	}

	const session = await prisma.session.findUnique({
		where: { id: sessionId },
		include: {
			user: {
				select: {
					id: true,
					username: true,
					fullName: true,
					role: true,
					hospitalId: true,
					isActive: true
				}
			}
		}
	});

	if (!session || session.expiresAt < new Date() || !session.user.isActive) {
		// Clean up expired session
		if (session) {
			await prisma.session.delete({ where: { id: sessionId } });
		}
		event.cookies.delete('session', { path: '/' });
		return null;
	}

	const { isActive: _, ...sessionUser } = session.user;
	return sessionUser;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
	await prisma.session.delete({
		where: { id: sessionId }
	}).catch(() => {
		// Ignore error if session doesn't exist
	});
}

/**
 * Check if user has required role
 */
export function hasRole(user: SessionUser | null, roles: Array<'SUPERADMIN' | 'ADMIN' | 'USER'>): boolean {
	if (!user) return false;
	return roles.includes(user.role);
}

/**
 * Check if user can access hospital data
 */
export function canAccessHospital(user: SessionUser | null, hospitalId: number): boolean {
	if (!user) return false;
	
	// SUPERADMIN and ADMIN can access all hospitals
	if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
		return true;
	}
	
	// USER can only access their assigned hospital
	return user.hospitalId === hospitalId;
}








