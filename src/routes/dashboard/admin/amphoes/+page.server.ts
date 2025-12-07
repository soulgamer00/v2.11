import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const amphoeSchema = z.object({
	id: z.number().optional(),
	code: z.string().min(1, 'กรุณากรอกรหัสอำเภอ'),
	nameTh: z.string().min(1, 'กรุณากรอกชื่ออำเภอ'),
	provinceId: z.number().min(1, 'กรุณาเลือกจังหวัด')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const search = url.searchParams.get('search') || '';
	const provinceId = url.searchParams.get('provinceId') ? parseInt(url.searchParams.get('provinceId')!) : null;

	// Get all provinces for dropdown
	const provinces = await prisma.province.findMany({
		where: { deletedAt: null },
		orderBy: { nameTh: 'asc' }
	});

	// Get all amphoes (exclude soft deleted)
	const amphoes = await prisma.amphoe.findMany({
		where: {
			deletedAt: null,
			...(provinceId ? { provinceId } : {}),
			...(search ? { 
				OR: [
					{ nameTh: { contains: search, mode: 'insensitive' } },
					{ code: { contains: search, mode: 'insensitive' } }
				]
			} : {})
		},
		orderBy: { nameTh: 'asc' },
		include: {
			province: {
				select: {
					id: true,
					nameTh: true
				}
			},
			_count: {
				select: {
					patients: true,
					sickCases: true,
					tambons: true
				}
			}
		}
	});

	const form = await superValidate(zod(amphoeSchema));

	return {
		amphoes,
		provinces,
		form,
		search,
		selectedProvinceId: provinceId
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(amphoeSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if province exists and not deleted
			const province = await prisma.province.findUnique({
				where: { id: form.data.provinceId }
			});

			if (!province || province.deletedAt) {
				return fail(400, { form, message: 'ไม่พบจังหวัดที่เลือก' });
			}

			// Check if code already exists in this province
			const existingByCode = await prisma.amphoe.findFirst({
				where: {
					code: form.data.code,
					provinceId: form.data.provinceId,
					deletedAt: null
				}
			});

			if (existingByCode) {
				return fail(400, { form, message: 'รหัสอำเภอนี้มีอยู่แล้วในจังหวัดนี้' });
			}

			// Check if name already exists in this province
			const existingByName = await prisma.amphoe.findFirst({
				where: {
					nameTh: form.data.nameTh,
					provinceId: form.data.provinceId,
					deletedAt: null
				}
			});

			if (existingByName) {
				return fail(400, { form, message: 'ชื่ออำเภอนี้มีอยู่แล้วในจังหวัดนี้' });
			}

			// Get max ID and add 1 for new amphoe
			const maxId = await prisma.amphoe.findFirst({
				orderBy: { id: 'desc' },
				select: { id: true }
			});

			const newId = maxId ? maxId.id + 1 : 1;

			const amphoe = await prisma.amphoe.create({
				data: {
					id: newId,
					code: form.data.code,
					nameTh: form.data.nameTh,
					provinceId: form.data.provinceId
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `Amphoe:${amphoe.nameTh}`);
		} catch (error) {
			console.error('Error creating amphoe:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(amphoeSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			// Get current amphoe
			const current = await prisma.amphoe.findUnique({
				where: { id: form.data.id }
			});

			if (!current || current.deletedAt) {
				return fail(400, { form, message: 'ไม่พบข้อมูล' });
			}

			// Check if province exists and not deleted
			const province = await prisma.province.findUnique({
				where: { id: form.data.provinceId }
			});

			if (!province || province.deletedAt) {
				return fail(400, { form, message: 'ไม่พบจังหวัดที่เลือก' });
			}

			// Check if new code already exists (and is not the current one)
			if (form.data.code !== current.code || form.data.provinceId !== current.provinceId) {
				const existingByCode = await prisma.amphoe.findFirst({
					where: {
						code: form.data.code,
						provinceId: form.data.provinceId,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByCode) {
					return fail(400, { form, message: 'รหัสอำเภอนี้มีอยู่แล้วในจังหวัดนี้' });
				}
			}

			// Check if new name already exists (and is not the current one)
			if (form.data.nameTh !== current.nameTh || form.data.provinceId !== current.provinceId) {
				const existingByName = await prisma.amphoe.findFirst({
					where: {
						nameTh: form.data.nameTh,
						provinceId: form.data.provinceId,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByName) {
					return fail(400, { form, message: 'ชื่ออำเภอนี้มีอยู่แล้วในจังหวัดนี้' });
				}
			}

			await prisma.amphoe.update({
				where: { id: form.data.id },
				data: {
					code: form.data.code,
					nameTh: form.data.nameTh,
					provinceId: form.data.provinceId
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `Amphoe:${form.data.nameTh}`);
		} catch (error) {
			console.error('Error updating amphoe:', error);
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
			// Get amphoe
			const amphoe = await prisma.amphoe.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							patients: true,
							sickCases: true,
							tambons: true
						}
					}
				}
			});

			if (!amphoe) {
				return fail(400, { message: 'ไม่พบข้อมูล' });
			}

			// Soft delete amphoe (allow even if in use, as it's soft delete)
			await prisma.amphoe.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.DELETE, `Amphoe:${amphoe.nameTh}`);
		} catch (error) {
			console.error('Error deleting amphoe:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

