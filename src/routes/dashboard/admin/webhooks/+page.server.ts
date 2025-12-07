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

	// Get all Discord webhook configs
	const webhookConfigs = await prisma.systemConfig.findMany({
		where: {
			key: {
				startsWith: 'DISCORD_WEBHOOK_'
			}
		},
		orderBy: {
			key: 'asc'
		}
	});

	// Parse webhooks
	const webhooks = webhookConfigs.map(config => {
		const match = config.key.match(/^DISCORD_WEBHOOK_(\d+)$/);
		return {
			id: config.id,
			index: match ? parseInt(match[1]) : 0,
			url: config.value,
			name: config.value.includes('discord.com') ? `Webhook ${match ? match[1] : 'Unknown'}` : 'Unknown'
		};
	}).sort((a, b) => a.index - b.index);

	return {
		webhooks
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/login');
		if (locals.user.role !== 'SUPERADMIN') {
			throw error(403, 'Forbidden: You do not have permission to perform this action.');
		}
		const user = locals.user;

		const formData = await request.formData();
		const url = formData.get('url')?.toString()?.trim();

		if (!url) {
			return fail(400, { message: 'กรุณากรอก URL' });
		}

		// Validate Discord webhook URL
		if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
			return fail(400, { message: 'URL ไม่ถูกต้อง ต้องเป็น Discord webhook URL' });
		}

		try {
			// Find the next available index
			const existingWebhooks = await prisma.systemConfig.findMany({
				where: {
					key: {
						startsWith: 'DISCORD_WEBHOOK_'
					}
				}
			});

			const indices = existingWebhooks
				.map(w => {
					const match = w.key.match(/^DISCORD_WEBHOOK_(\d+)$/);
					return match ? parseInt(match[1]) : 0;
				})
				.filter(i => i > 0);

			const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 1;

			await prisma.systemConfig.create({
				data: {
					key: `DISCORD_WEBHOOK_${nextIndex}`,
					value: url
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `${AuditResources.USER}:Discord Webhook`, `Created webhook ${nextIndex}`);

			return { success: true, message: 'เพิ่ม Webhook สำเร็จ' };
		} catch (error) {
			console.error('Error creating webhook:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการเพิ่ม Webhook' });
		}
	},

	update: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/login');
		if (locals.user.role !== 'SUPERADMIN') {
			throw error(403, 'Forbidden: You do not have permission to perform this action.');
		}
		const user = locals.user;

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const url = formData.get('url')?.toString()?.trim();

		if (!id || !url) {
			return fail(400, { message: 'ข้อมูลไม่ครบถ้วน' });
		}

		// Validate Discord webhook URL
		if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
			return fail(400, { message: 'URL ไม่ถูกต้อง ต้องเป็น Discord webhook URL' });
		}

		try {
			await prisma.systemConfig.update({
				where: { id },
				data: { value: url }
			});

			await logAudit(user.id, AuditActions.UPDATE, `${AuditResources.USER}:Discord Webhook`, `Updated webhook ${id}`);

			return { success: true, message: 'แก้ไข Webhook สำเร็จ' };
		} catch (error) {
			console.error('Error updating webhook:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการแก้ไข Webhook' });
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/login');
		if (locals.user.role !== 'SUPERADMIN') {
			throw error(403, 'Forbidden: You do not have permission to perform this action.');
		}
		const user = locals.user;

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			await prisma.systemConfig.delete({
				where: { id }
			});

			await logAudit(user.id, AuditActions.DELETE, `${AuditResources.USER}:Discord Webhook`, `Deleted webhook ${id}`);

			return { success: true, message: 'ลบ Webhook สำเร็จ' };
		} catch (error) {
			console.error('Error deleting webhook:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบ Webhook' });
		}
	},

	test: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/login');
		if (locals.user.role !== 'SUPERADMIN') {
			throw error(403, 'Forbidden: You do not have permission to perform this action.');
		}
		const user = locals.user;

		const formData = await request.formData();
		const url = formData.get('url')?.toString()?.trim();

		if (!url) {
			return fail(400, { message: 'กรุณากรอก URL' });
		}

		try {
			const embed = {
				title: '🧪 ทดสอบ Webhook',
				description: 'นี่คือการทดสอบการส่งข้อความจาก รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0',
				color: 0x0099ff,
				timestamp: new Date().toISOString(),
				footer: {
					text: 'รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0'
				}
			};

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					embeds: [embed]
				})
			});

			if (response.ok) {
				return { success: true, message: 'ทดสอบสำเร็จ! ตรวจสอบ Discord channel ของคุณ' };
			} else {
				const errorText = await response.text();
				return fail(400, { message: `ทดสอบไม่สำเร็จ: ${errorText}` });
			}
		} catch (error: any) {
			console.error('Error testing webhook:', error);
			return fail(500, { message: `เกิดข้อผิดพลาด: ${error.message || 'Unknown error'}` });
		}
	}
};

