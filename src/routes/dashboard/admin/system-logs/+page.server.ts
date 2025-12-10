import { redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}

	try {
		// Pagination
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = 20;
		const skip = (page - 1) * limit;

		// Search filter
		const search = url.searchParams.get('search') || '';

		// Build where clause
		const where: any = {};
		if (search) {
			where.OR = [
				{ path: { contains: search, mode: 'insensitive' } },
				{ message: { contains: search, mode: 'insensitive' } }
			];
		}

		// Fetch error logs with pagination
		const [errorLogs, totalCount] = await Promise.all([
			prisma.errorLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.errorLog.count({ where })
		]);

		// Fetch user info for logs that have userId
		const userIds = errorLogs.filter(log => log.userId).map(log => log.userId!);
		const users = userIds.length > 0 
			? await prisma.user.findMany({
				where: { id: { in: userIds } },
				select: { id: true, username: true, fullName: true }
			})
			: [];

		// Create a map for quick user lookup
		const userMap = new Map(users.map(u => [u.id, u]));

		// Attach user info to logs
		const logsWithUsers = errorLogs.map(log => ({
			...log,
			user: log.userId ? userMap.get(log.userId) : null
		}));

		const totalPages = Math.ceil(totalCount / limit);

		return {
			logs: logsWithUsers,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			},
			search
		};
	} catch (err: any) {
		console.error('Error loading system logs:', err);
		// If ErrorLog table doesn't exist, return empty data
		if (err.message?.includes('ErrorLog') || err.message?.includes('does not exist')) {
			return {
				logs: [],
				pagination: {
					page: 1,
					limit: 20,
					totalCount: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false
				},
				search: ''
			};
		}
		// Re-throw other errors
		throw error(500, `Failed to load system logs: ${err.message}`);
	}
};

