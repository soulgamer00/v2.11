import type { SessionUser } from '$lib/server/auth';

/**
 * Check if user has a specific permission (client-side version)
 * This is a client-safe version of hasPermission from auth.ts
 */
export function hasPermission(user: SessionUser | null, permission: string): boolean {
	if (!user) return false;
	
	// Ensure permissions is an array
	const permissions = Array.isArray(user.permissions) ? user.permissions : (user.permissions ? [user.permissions] : []);
	
	// SUPERADMIN has all permissions
	if (user.role === 'SUPERADMIN') {
		return true;
	}
	
	// ADMIN has most permissions by default (can be restricted by permissions array)
	if (user.role === 'ADMIN') {
		// If permissions array exists and is not empty, check it
		if (permissions.length > 0) {
			return permissions.includes(permission);
		}
		// Default: ADMIN has all permissions except SUPERADMIN-only features
		return true;
	}
	
	// USER: Check permissions array
	if (permissions.length > 0) {
		return permissions.includes(permission);
	}
	
	// Default: USER has no permissions unless explicitly granted
	return false;
}

