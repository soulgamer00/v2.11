import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	
	if (!user) {
		return { user: null, unreadNotifications: 0 };
	}

	// Get unread notification count
	const { prisma } = await import('$lib/server/db');
	const unreadCount = await prisma.notification.count({
		where: {
			userId: user.id,
			isRead: false
		}
	});

	return {
		user,
		unreadNotifications: unreadCount
	};
};
