import { redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 50;
	const skip = (page - 1) * limit;

	const search = url.searchParams.get('search') || '';
	const actionFilter = url.searchParams.get('action') || '';
	const resourceFilter = url.searchParams.get('resource') || '';

	// Build where clause
	const where: any = {};

	if (search) {
		where.OR = [
			{ action: { contains: search, mode: 'insensitive' } },
			{ resource: { contains: search, mode: 'insensitive' } },
			{ userId: { contains: search, mode: 'insensitive' } }
		];
	}

	if (actionFilter) {
		where.action = actionFilter;
	}

	if (resourceFilter) {
		where.resource = resourceFilter;
	}

	// Get audit logs with user info
	const [auditLogs, totalCount] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			orderBy: { timestamp: 'desc' },
			skip,
			take: limit
		}),
		prisma.auditLog.count({ where })
	]);

	// Get user info for each log
	const userIds = [...new Set(auditLogs.map((log) => log.userId))];
	const users = await prisma.user.findMany({
		where: { id: { in: userIds } },
		select: {
			id: true,
			username: true,
			fullName: true
		}
	});

	const userMap = new Map(users.map((u) => [u.id, u]));

	// Combine audit logs with user info
	const logsWithUsers = auditLogs.map((log) => ({
		...log,
		user: userMap.get(log.userId) || { username: 'Unknown', fullName: 'Unknown User' }
	}));

	// Get unique actions and resources for filters
	const [uniqueActions, uniqueResources] = await Promise.all([
		prisma.auditLog.findMany({
			select: { action: true },
			distinct: ['action'],
			orderBy: { action: 'asc' }
		}),
		prisma.auditLog.findMany({
			select: { resource: true },
			distinct: ['resource'],
			orderBy: { resource: 'asc' }
		})
	]);

	const totalPages = Math.ceil(totalCount / limit);

	return {
		auditLogs: logsWithUsers,
		totalCount,
		totalPages,
		currentPage: page,
		search,
		actionFilter,
		resourceFilter,
		uniqueActions: uniqueActions.map((a) => a.action),
		uniqueResources: uniqueResources.map((r) => r.resource)
	};
};



