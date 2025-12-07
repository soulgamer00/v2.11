import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { hospitalSchema } from '$lib/schemas/masterdata';
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

	// Get all hospitals (exclude soft deleted)
	const hospitals = await prisma.hospital.findMany({
		where: {
			deletedAt: null,
			...(search
				? {
						OR: [
							{ name: { contains: search, mode: 'insensitive' } },
							{ code9New: { contains: search } },
							{ code9: { contains: search } },
							{ code5: { contains: search } },
							{ type: { contains: search, mode: 'insensitive' } }
						]
				  }
				: {})
		},
		include: {
			_count: {
				select: {
					users: true,
					cases: true
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	const form = await superValidate(zod(hospitalSchema));

	return {
		hospitals,
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

		const form = await superValidate(request, zod(hospitalSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const hospital = await prisma.hospital.create({
				data: {
					name: form.data.name,
					code9: form.data.code9,
					code9New: form.data.code9New,
					code5: form.data.code5,
					type: form.data.type,
					orgType: form.data.orgType,
					healthServiceType: form.data.healthServiceType,
					affiliation: form.data.affiliation,
					department: form.data.department
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `${AuditResources.HOSPITAL}:${hospital.code9New || hospital.code9 || hospital.id}`);
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

		const form = await superValidate(request, zod(hospitalSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			const hospital = await prisma.hospital.update({
				where: { id: form.data.id },
				data: {
					name: form.data.name,
					code9: form.data.code9,
					code9New: form.data.code9New,
					code5: form.data.code5,
					type: form.data.type,
					orgType: form.data.orgType,
					healthServiceType: form.data.healthServiceType,
					affiliation: form.data.affiliation,
					department: form.data.department
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `${AuditResources.HOSPITAL}:${hospital.code9New || hospital.code9 || hospital.id}`);
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
			// Get hospital
			const hospital = await prisma.hospital.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							users: true,
							cases: true
						}
					}
				}
			});

			if (!hospital) {
				return fail(400, { message: 'ไม่พบข้อมูลหน่วยงาน' });
			}

			// Soft delete by setting deletedAt
			await prisma.hospital.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.SOFT_DELETE, `${AuditResources.HOSPITAL}:${hospital.code9New || hospital.code9 || hospital.id}`);
		} catch (error: any) {
			console.error('Error deleting hospital:', error);
			// If foreign key constraint, try to handle it
			if (error.code === 'P2003') {
				return fail(400, { message: 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานอยู่' });
			}
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

