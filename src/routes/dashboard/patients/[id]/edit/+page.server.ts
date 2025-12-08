import { error, redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import { patientSchema } from '$lib/schemas/case';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	if (!hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		throw error(403, 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ป่วย');
	}

	const patientId = params.id;

	// Get patient with related data
	const patient = await prisma.patient.findUnique({
		where: { id: patientId },
		include: {
			province: {
				select: { id: true, nameTh: true }
			},
			amphoe: {
				select: { id: true, nameTh: true }
			},
			tambon: {
				select: { id: true, nameTh: true }
			}
		}
	});

	if (!patient) {
		throw error(404, 'ไม่พบข้อมูลผู้ป่วย');
	}

	if (patient.deletedAt) {
		throw error(404, 'ผู้ป่วยนี้ถูกลบแล้ว');
	}

	// Get provinces for dropdown
	const provinces = await prisma.province.findMany({
		where: { deletedAt: null },
		orderBy: { nameTh: 'asc' }
	});

	// Get master data for dropdowns
	const masterData = await prisma.masterData.findMany({
		orderBy: { category: 'asc' }
	});

	const masterDataByCategory: Record<string, Array<{ value: string; label: string }>> = {};
	masterData.forEach((item) => {
		if (!masterDataByCategory[item.category]) {
			masterDataByCategory[item.category] = [];
		}
		masterDataByCategory[item.category].push({
			value: item.value,
			label: item.label || item.value
		});
	});

	// Format date for form (YYYY-MM-DD)
	const formatDate = (date: Date | null) => (date ? date.toISOString().split('T')[0] : '');

	// Prepare form data
	const formData = {
		id: patient.id,
		idCard: patient.idCard || '',
		prefix: patient.prefix || '',
		firstName: patient.firstName,
		lastName: patient.lastName,
		gender: patient.gender as 'MALE' | 'FEMALE',
		birthDate: formatDate(patient.birthDate),
		nationality: patient.nationality || 'ไทย',
		maritalStatus: patient.maritalStatus || '',
		occupation: patient.occupation || '',
		phone: patient.phone || '',
		addressNo: patient.addressNo || '',
		moo: patient.moo || '',
		road: patient.road || '',
		postalCode: patient.postalCode || '',
		provinceId: patient.provinceId || 0,
		amphoeId: patient.amphoeId || 0,
		tambonId: patient.tambonId || 0
	};

	const form = await superValidate(formData, zod(patientSchema));

	return {
		form,
		patient,
		provinces,
		masterData: masterDataByCategory
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ป่วย' });
		}

		const patientId = params.id;
		const form = await superValidate(request, zod(patientSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Check if patient exists and not deleted
			const existingPatient = await prisma.patient.findUnique({
				where: { id: patientId }
			});

			if (!existingPatient) {
				return fail(404, { message: 'ไม่พบข้อมูลผู้ป่วย' });
			}

			if (existingPatient.deletedAt) {
				return fail(400, { message: 'ผู้ป่วยนี้ถูกลบแล้ว' });
			}

			// Check if ID card is being changed and if it conflicts with another patient
			if (form.data.idCard && form.data.idCard !== existingPatient.idCard) {
				const conflictingPatient = await prisma.patient.findUnique({
					where: { idCard: form.data.idCard }
				});

				if (conflictingPatient && conflictingPatient.id !== patientId) {
					return fail(400, { message: 'เลขบัตรประชาชนนี้ถูกใช้โดยผู้ป่วยอื่นแล้ว' });
				}
			}

			// Update patient
			await prisma.patient.update({
				where: { id: patientId },
				data: {
					idCard: form.data.idCard || null,
					prefix: form.data.prefix,
					firstName: form.data.firstName,
					lastName: form.data.lastName,
					gender: form.data.gender,
					birthDate: form.data.birthDate ? new Date(form.data.birthDate) : null,
					nationality: form.data.nationality,
					maritalStatus: form.data.maritalStatus || null,
					occupation: form.data.occupation || null,
					phone: form.data.phone || null,
					addressNo: form.data.addressNo || null,
					moo: form.data.moo || null,
					road: form.data.road || null,
					postalCode: form.data.postalCode || null,
					provinceId: form.data.provinceId || null,
					amphoeId: form.data.amphoeId || null,
					tambonId: form.data.tambonId || null
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `${AuditResources.PATIENT}:${patientId}`);

			return { success: true, form };
		} catch (error) {
			console.error('Error updating patient:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
		}
	}
};

