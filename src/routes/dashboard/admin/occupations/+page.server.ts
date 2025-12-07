import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { occupationSchema } from '$lib/schemas/masterdata';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const search = url.searchParams.get('search') || '';

	// Get all occupations from MasterData (exclude soft deleted)
	const occupations = await prisma.masterData.findMany({
		where: {
			category: 'OCCUPATION',
			deletedAt: null,
			...(search ? { value: { contains: search, mode: 'insensitive' } } : {})
		},
		orderBy: { value: 'asc' }
	});

	// Check usage count for each occupation
	const occupationsWithUsage = await Promise.all(
		occupations.map(async (occ) => {
			const usageCount = await prisma.patient.count({
				where: { occupation: occ.value }
			});
			return {
				...occ,
				usageCount
			};
		})
	);

	const form = await superValidate(zod(occupationSchema));

	return {
		occupations: occupationsWithUsage,
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

		const form = await superValidate(request, zod(occupationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if occupation already exists
			const existing = await prisma.masterData.findUnique({
				where: {
					category_value: {
						category: 'OCCUPATION',
						value: form.data.value
					}
				}
			});

			if (existing) {
				return fail(400, { form, message: 'อาชีพนี้มีอยู่แล้ว' });
			}

			const occupation = await prisma.masterData.create({
				data: {
					category: 'OCCUPATION',
					value: form.data.value
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `${AuditResources.OCCUPATION}:${occupation.value}`);
		} catch (error) {
			console.error('Error creating occupation:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(occupationSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			// Get current occupation
			const current = await prisma.masterData.findUnique({
				where: { id: form.data.id }
			});

			if (!current || current.category !== 'OCCUPATION') {
				return fail(400, { form, message: 'ไม่พบข้อมูลอาชีพ' });
			}

			// Check if new value already exists (and is not the current one)
			if (form.data.value !== current.value) {
				const existing = await prisma.masterData.findUnique({
					where: {
						category_value: {
							category: 'OCCUPATION',
							value: form.data.value
						}
					}
				});

				if (existing) {
					return fail(400, { form, message: 'อาชีพนี้มีอยู่แล้ว' });
				}
			}

			// Update: Delete old and create new (because of unique constraint)
			// Or update all patients using this occupation first
			if (form.data.value !== current.value) {
				// Update all patients using old value
				await prisma.patient.updateMany({
					where: { occupation: current.value },
					data: { occupation: form.data.value }
				});

				// Delete old record
				await prisma.masterData.delete({
					where: { id: form.data.id }
				});

				// Create new record
				await prisma.masterData.create({
					data: {
						category: 'OCCUPATION',
						value: form.data.value
					}
				});
			}
		} catch (error) {
			console.error('Error updating occupation:', error);
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
			// Get occupation
			const occupation = await prisma.masterData.findUnique({
				where: { id }
			});

			if (!occupation || occupation.category !== 'OCCUPATION') {
				return fail(400, { message: 'ไม่พบข้อมูลอาชีพ' });
			}

			// Check if occupation is used (for info only, still allow delete)
			const usageCount = await prisma.patient.count({
				where: { occupation: occupation.value }
			});

			// Soft delete occupation
			await prisma.masterData.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.DELETE, `${AuditResources.OCCUPATION}:${occupation.value}`);
		} catch (error) {
			console.error('Error deleting occupation:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

