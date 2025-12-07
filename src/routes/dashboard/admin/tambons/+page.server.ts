import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { prisma } from '$lib/server/db';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

const tambonSchema = z.object({
	id: z.number().optional(),
	code: z.string().min(1, 'กรุณากรอกรหัสตำบล'),
	nameTh: z.string().min(1, 'กรุณากรอกชื่อตำบล'),
	postalCode: z.string().optional(),
	amphoeId: z.number().min(1, 'กรุณาเลือกอำเภอ')
});

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const search = url.searchParams.get('search') || '';
	const provinceId = url.searchParams.get('provinceId') ? parseInt(url.searchParams.get('provinceId')!) : null;
	const amphoeId = url.searchParams.get('amphoeId') ? parseInt(url.searchParams.get('amphoeId')!) : null;

	// Get all provinces for dropdown
	const provinces = await prisma.province.findMany({
		where: { deletedAt: null },
		orderBy: { nameTh: 'asc' }
	});

	// Get amphoes based on province filter
	const amphoes = await prisma.amphoe.findMany({
		where: {
			deletedAt: null,
			...(provinceId ? { provinceId } : {})
		},
		include: {
			province: {
				select: {
					id: true,
					nameTh: true
				}
			}
		},
		orderBy: { nameTh: 'asc' }
	});

	// Get all tambons (exclude soft deleted)
	const tambons = await prisma.tambon.findMany({
		where: {
			deletedAt: null,
			...(amphoeId ? { amphoeId } : {}),
			...(provinceId ? {
				amphoe: {
					provinceId
				}
			} : {}),
			...(search ? { 
				OR: [
					{ nameTh: { contains: search, mode: 'insensitive' } },
					{ code: { contains: search, mode: 'insensitive' } },
					{ postalCode: { contains: search, mode: 'insensitive' } }
				]
			} : {})
		},
		orderBy: { nameTh: 'asc' },
		include: {
			amphoe: {
				select: {
					id: true,
					nameTh: true,
					province: {
						select: {
							id: true,
							nameTh: true
						}
					}
				}
			},
			_count: {
				select: {
					patients: true,
					sickCases: true
				}
			}
		}
	});

	const form = await superValidate(zod(tambonSchema));

	return {
		tambons,
		provinces,
		amphoes,
		form,
		search,
		selectedProvinceId: provinceId,
		selectedAmphoeId: amphoeId
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(tambonSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if amphoe exists and not deleted
			const amphoe = await prisma.amphoe.findUnique({
				where: { id: form.data.amphoeId }
			});

			if (!amphoe || amphoe.deletedAt) {
				return fail(400, { form, message: 'ไม่พบอำเภอที่เลือก' });
			}

			// Check if code already exists in this amphoe
			const existingByCode = await prisma.tambon.findFirst({
				where: {
					code: form.data.code,
					amphoeId: form.data.amphoeId,
					deletedAt: null
				}
			});

			if (existingByCode) {
				return fail(400, { form, message: 'รหัสตำบลนี้มีอยู่แล้วในอำเภอนี้' });
			}

			// Check if name already exists in this amphoe
			const existingByName = await prisma.tambon.findFirst({
				where: {
					nameTh: form.data.nameTh,
					amphoeId: form.data.amphoeId,
					deletedAt: null
				}
			});

			if (existingByName) {
				return fail(400, { form, message: 'ชื่อตำบลนี้มีอยู่แล้วในอำเภอนี้' });
			}

			// Get max ID and add 1 for new tambon
			const maxId = await prisma.tambon.findFirst({
				orderBy: { id: 'desc' },
				select: { id: true }
			});

			const newId = maxId ? maxId.id + 1 : 1;

			const tambon = await prisma.tambon.create({
				data: {
					id: newId,
					code: form.data.code,
					nameTh: form.data.nameTh,
					postalCode: form.data.postalCode || null,
					amphoeId: form.data.amphoeId
				}
			});

			await logAudit(user.id, AuditActions.CREATE, `Tambon:${tambon.nameTh}`);
		} catch (error) {
			console.error('Error creating tambon:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || user.role !== 'SUPERADMIN') {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(tambonSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		try {
			// Get current tambon
			const current = await prisma.tambon.findUnique({
				where: { id: form.data.id }
			});

			if (!current || current.deletedAt) {
				return fail(400, { form, message: 'ไม่พบข้อมูล' });
			}

			// Check if amphoe exists and not deleted
			const amphoe = await prisma.amphoe.findUnique({
				where: { id: form.data.amphoeId }
			});

			if (!amphoe || amphoe.deletedAt) {
				return fail(400, { form, message: 'ไม่พบอำเภอที่เลือก' });
			}

			// Check if new code already exists (and is not the current one)
			if (form.data.code !== current.code || form.data.amphoeId !== current.amphoeId) {
				const existingByCode = await prisma.tambon.findFirst({
					where: {
						code: form.data.code,
						amphoeId: form.data.amphoeId,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByCode) {
					return fail(400, { form, message: 'รหัสตำบลนี้มีอยู่แล้วในอำเภอนี้' });
				}
			}

			// Check if new name already exists (and is not the current one)
			if (form.data.nameTh !== current.nameTh || form.data.amphoeId !== current.amphoeId) {
				const existingByName = await prisma.tambon.findFirst({
					where: {
						nameTh: form.data.nameTh,
						amphoeId: form.data.amphoeId,
						deletedAt: null,
						id: { not: form.data.id }
					}
				});

				if (existingByName) {
					return fail(400, { form, message: 'ชื่อตำบลนี้มีอยู่แล้วในอำเภอนี้' });
				}
			}

			await prisma.tambon.update({
				where: { id: form.data.id },
				data: {
					code: form.data.code,
					nameTh: form.data.nameTh,
					postalCode: form.data.postalCode || null,
					amphoeId: form.data.amphoeId
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `Tambon:${form.data.nameTh}`);
		} catch (error) {
			console.error('Error updating tambon:', error);
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
			// Get tambon
			const tambon = await prisma.tambon.findUnique({
				where: { id },
				include: {
					_count: {
						select: {
							patients: true,
							sickCases: true
						}
					}
				}
			});

			if (!tambon) {
				return fail(400, { message: 'ไม่พบข้อมูล' });
			}

			// Soft delete tambon (allow even if in use, as it's soft delete)
			await prisma.tambon.update({
				where: { id },
				data: {
					deletedAt: new Date()
				}
			});

			await logAudit(user.id, AuditActions.DELETE, `Tambon:${tambon.nameTh}`);
		} catch (error) {
			console.error('Error deleting tambon:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

