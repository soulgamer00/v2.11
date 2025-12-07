import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const notifications = await prisma.notification.findMany({
		where: { userId: user.id },
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	const unreadCount = await prisma.notification.count({
		where: {
			userId: user.id,
			isRead: false
		}
	});

	return {
		notifications,
		unreadCount
	};
};

export const actions: Actions = {
	markAsRead: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			return { success: false, message: 'Unauthorized' };
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (id) {
			await prisma.notification.update({
				where: { id },
				data: { isRead: true }
			});
		} else {
			// Mark all as read
			await prisma.notification.updateMany({
				where: { userId: user.id, isRead: false },
				data: { isRead: true }
			});
		}

		return { success: true };
	}
};


