import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const provinceSchema = z.object({
	id: z.number().optional(),
	code: z.string().min(1, 'กรุณากรอกรหัสจังหวัด'),
	nameTh: z.string().min(1, 'กรุณากรอกชื่อจังหวัด')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const search = url.searchParams.get('search') || '';

	// Get all provinces (exclude soft deleted)
	const provinces = await prisma.province.findMany({
		where: {
			deletedAt: null,
			...(search ? { 
				OR: [
					{ nameTh: { contains: search, mode: 'insensitive' } },
					{ code: { contains: search, mode: 'insensitive' } }
				]
			} : {})
		},
		orderBy: { nameTh: 'asc' },
		include: {
			_count: {
				select: {
					patients: true,
					sickCases: true,
					amphoes: true
				}
			}
		}
	});

	const form = await superValidate(zod(provinceSchema));

	return {
		provinces,
		form,
		search
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(provinceSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if code already exists
			const existingByCode = await prisma.province.findFirst({
				where: {
					code: form.data.code,
					deletedAt: null
				}
			});

			if (existingByCode) {
				return fail(400, { form, message: 'รหัสจังหวัดนี้มีอยู่แล้ว' });
			}

			// Check if name already exists
			const existingByName = await prisma.province.findFirst({
				where: {
					nameTh: form.data.nameTh,
					deletedAt: null
				}
			});

			if (existingByName) {
				return fail(400, { form, message: 'ชื่อจังหวัดนี้มีอยู่แล้ว' });
			}

			// Get max ID and add 1 for new province
			const maxId = await prisma.province.findFirst({
				orderBy: { id: 'desc' },
				select: { id: true }
			});

			const newId = maxId ? maxId.id + 1 : 1;

			const province = await prisma.province.create({
				data: {
					id: newId,
					code: form.data.code,
					nameTh: form.data.nameTh
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `Province:${province.nameTh}`);
		} catch (error) {
			console.error('Error creating province:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(provinceSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			// Get current province
			const current = await prisma.province.findUnique({
				where: { id: form.data.id }
			});

			if (!current || current.deletedAt) {
				return fail(400, { form, message: 'ไม่พบข้อมูล' });
			}

			// Check if new code already exists (and is not the current one)
			if (form.data.code !== current.code) {
				const existingByCode = await prisma.province.findFirst({
					where: {
						code: form.data.code,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByCode) {
					return fail(400, { form, message: 'รหัสจังหวัดนี้มีอยู่แล้ว' });
				}
			}

			// Check if new name already exists (and is not the current one)
			if (form.data.nameTh !== current.nameTh) {
				const existingByName = await prisma.province.findFirst({
					where: {
						nameTh: form.data.nameTh,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByName) {
					return fail(400, { form, message: 'ชื่อจังหวัดนี้มีอยู่แล้ว' });
				}
			}

			await prisma.province.update({
				where: { id: form.data.id },
				data: {
					code: form.data.code,
					nameTh: form.data.nameTh
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `Province:${form.data.nameTh}`);
		} catch (error) {
			console.error('Error updating province:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
		}

		return { form };
	},

	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = parseInt(formData.get('id')?.toString() || '0');

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			// Get province
			const province = await prisma.province.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							patients: true,
							sickCases: true,
							amphoes: true
						}
					}
				}
			});

			if (!province) {
				return fail(400, { message: 'ไม่พบข้อมูล' });
			}

			// Soft delete province (allow even if in use, as it's soft delete)
			await prisma.province.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.DELETE, `Province:${province.nameTh}`);
		} catch (error) {
			console.error('Error deleting province:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

