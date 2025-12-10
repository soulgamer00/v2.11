import { fail, redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	// Get Discord server URL from SystemConfig
	const discordServerConfig = await prisma.systemConfig.findUnique({
		where: { key: 'DISCORD_SERVER_URL' }
	});

	return {
		discordServerUrl: discordServerConfig?.value || ''
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/login');
		if (locals.user.role !== 'SUPERADMIN') {
			throw error(403, 'Forbidden: You do not have permission to perform this action.');
		}
		const user = locals.user;

		const formData = await request.formData();
		const url = formData.get('url')?.toString()?.trim() || '';

		// Validate Discord invite URL if provided
		if (url && !url.match(/^(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+$/)) {
			return fail(400, { message: 'URL ไม่ถูกต้อง ต้องเป็น Discord invite link (discord.gg/xxx หรือ discord.com/invite/xxx)' });
		}

		try {
			// Check if config exists
			const existingConfig = await prisma.systemConfig.findUnique({
				where: { key: 'DISCORD_SERVER_URL' }
			});

			if (existingConfig) {
				if (url) {
					// Update existing config
					await prisma.systemConfig.update({
						where: { id: existingConfig.id },
						data: { value: url }
					});
					await logAudit(user.id, AuditActions.UPDATE, AuditResources.SYSTEM_CONFIG, 'Updated Discord server URL');
				} else {
					// Delete if empty
					await prisma.systemConfig.delete({
						where: { id: existingConfig.id }
					});
					await logAudit(user.id, AuditActions.DELETE, AuditResources.SYSTEM_CONFIG, 'Removed Discord server URL');
				}
			} else if (url) {
				// Create new config
				await prisma.systemConfig.create({
					data: {
						key: 'DISCORD_SERVER_URL',
						value: url
					}
				});
				await logAudit(user.id, AuditActions.CREATE, AuditResources.SYSTEM_CONFIG, 'Created Discord server URL');
			}

			return { success: true, message: url ? 'บันทึก Discord Server Link สำเร็จ' : 'ลบ Discord Server Link สำเร็จ' };
		} catch (error) {
			console.error('Error updating Discord server URL:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการบันทึก' });
		}
	}
};

