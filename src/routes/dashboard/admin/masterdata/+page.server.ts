import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const masterDataSchema = z.object({
	id: z.number().optional(),
	category: z.enum(['PREFIX', 'NATIONALITY', 'MARITAL_STATUS']),
	value: z.string().min(1, 'กรุณากรอกข้อมูล')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const category = (url.searchParams.get('category') || 'PREFIX') as 'PREFIX' | 'NATIONALITY' | 'MARITAL_STATUS';
	const search = url.searchParams.get('search') || '';

	// Get all masterdata for the category (exclude soft deleted)
	const masterData = await prisma.masterData.findMany({
		where: {
			category,
			deletedAt: null,
			...(search ? { value: { contains: search, mode: 'insensitive' } } : {})
		},
		orderBy: { value: 'asc' }
	});

	// Count usage for each item
	const masterDataWithUsage = await Promise.all(
		masterData.map(async (item) => {
			let usageCount = 0;
			if (category === 'PREFIX') {
				usageCount = await prisma.patient.count({
					where: { prefix: item.value }
				});
			} else if (category === 'NATIONALITY') {
				usageCount = await prisma.patient.count({
					where: { nationality: item.value }
				});
			} else if (category === 'MARITAL_STATUS') {
				usageCount = await prisma.patient.count({
					where: { maritalStatus: item.value }
				});
			}
			return { ...item, usageCount };
		})
	);

	const form = await superValidate(zod(masterDataSchema));

	return {
		masterData: masterDataWithUsage,
		category,
		form,
		search
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(masterDataSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if already exists
			const existing = await prisma.masterData.findUnique({
				where: {
					category_value: {
						category: form.data.category,
						value: form.data.value
					}
				}
			});

			if (existing) {
				return fail(400, { form, message: 'ข้อมูลนี้มีอยู่แล้ว' });
			}

			const masterData = await prisma.masterData.create({
				data: {
					category: form.data.category,
					value: form.data.value
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `${form.data.category}:${masterData.value}`);
		} catch (error) {
			console.error('Error creating masterdata:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(masterDataSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			// Get current masterdata
			const current = await prisma.masterData.findUnique({
				where: { id: form.data.id }
			});

			if (!current || current.category !== form.data.category) {
				return fail(400, { form, message: 'ไม่พบข้อมูล' });
			}

			// Check if new value already exists (and is not the current one)
			if (form.data.value !== current.value) {
				const existing = await prisma.masterData.findUnique({
					where: {
						category_value: {
							category: form.data.category,
							value: form.data.value
						}
					}
				});

				if (existing) {
					return fail(400, { form, message: 'ข้อมูลนี้มีอยู่แล้ว' });
				}
			}

			// Update all patients using old value
			if (form.data.value !== current.value) {
				if (form.data.category === 'PREFIX') {
					await prisma.patient.updateMany({
						where: { prefix: current.value },
						data: { prefix: form.data.value }
					});
				} else if (form.data.category === 'NATIONALITY') {
					await prisma.patient.updateMany({
						where: { nationality: current.value },
						data: { nationality: form.data.value }
					});
				} else if (form.data.category === 'MARITAL_STATUS') {
					await prisma.patient.updateMany({
						where: { maritalStatus: current.value },
						data: { maritalStatus: form.data.value }
					});
				}

				// Delete old record
				await prisma.masterData.delete({
					where: { id: form.data.id }
				});

				// Create new record
				await prisma.masterData.create({
					data: {
						category: form.data.category,
						value: form.data.value
					}
				});
			}

			await logAudit(user.id, AuditActions.UPDATE, `${form.data.category}:${form.data.value}`);
		} catch (error) {
			console.error('Error updating masterdata:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
		}

		return { form };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			// Get masterdata
			const masterData = await prisma.masterData.findUnique({
				where: { id }
			});

			if (!masterData) {
				return fail(400, { message: 'ไม่พบข้อมูล' });
			}

			// Soft delete masterdata
			await prisma.masterData.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.DELETE, `${masterData.category}:${masterData.value}`);
		} catch (error) {
			console.error('Error deleting masterdata:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

