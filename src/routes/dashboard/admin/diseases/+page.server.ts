import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { diseaseSchema } from '$lib/schemas/masterdata';
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

	// Get all diseases (exclude soft deleted)
	const diseases = await prisma.disease.findMany({
		where: {
			deletedAt: null,
			...(search
				? {
						OR: [
							{ code: { contains: search, mode: 'insensitive' } },
							{ nameTh: { contains: search, mode: 'insensitive' } },
							{ nameEn: { contains: search, mode: 'insensitive' } },
							{ abbreviation: { contains: search, mode: 'insensitive' } }
						]
				  }
				: {})
		},
		orderBy: { nameTh: 'asc' }
	});

	const form = await superValidate(zod(diseaseSchema));

	return {
		diseases,
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

		const form = await superValidate(request, zod(diseaseSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await prisma.disease.create({
				data: {
					code: form.data.code,
					nameTh: form.data.nameTh,
					nameEn: form.data.nameEn,
					abbreviation: form.data.abbreviation,
					symptoms: form.data.symptoms,
					isActive: form.data.isActive
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `${AuditResources.DISEASE}:${form.data.code}`);
		} catch (error) {
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(diseaseSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			const disease = await prisma.disease.update({
				where: { id: form.data.id },
				data: {
					code: form.data.code,
					nameTh: form.data.nameTh,
					nameEn: form.data.nameEn,
					abbreviation: form.data.abbreviation,
					symptoms: form.data.symptoms,
					isActive: form.data.isActive
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `${AuditResources.DISEASE}:${disease.code}`);
		} catch (error) {
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
			// Get disease first
			const disease = await prisma.disease.findUnique({ where: { id } });
			if (!disease) {
				return fail(400, { message: 'ไม่พบข้อมูลโรค' });
			}

			// Soft delete by setting deletedAt and isActive
			await prisma.disease.update({
				where: { id },
				data: {
					deletedAt: new Date(),
					isActive: false
				}
			});

			await logAudit(user.id, AuditActions.SOFT_DELETE, `${AuditResources.DISEASE}:${disease.code}`);
		} catch (error) {
			console.error('Error deleting disease:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

