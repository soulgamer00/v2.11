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

	// Get Discord server URL from SystemConfig
	const discordServerConfig = await prisma.systemConfig.findUnique({
		where: { key: 'DISCORD_SERVER_URL' }
	});
	const discordServerUrl = discordServerConfig?.value || null;

	// Ensure permissions is always an array for serialization
	const userWithPermissions = {
		...user,
		permissions: Array.isArray(user.permissions) 
			? user.permissions 
			: (user.permissions ? [user.permissions] : [])
	};

	console.log('Dashboard layout server - User permissions:', userWithPermissions.permissions);

	return {
		user: userWithPermissions,
		unreadNotifications: unreadCount,
		discordServerUrl
	};
};
