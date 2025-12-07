import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { caseReportSchema } from '$lib/schemas/case';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import { calculateAge } from '$lib/utils/date';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		throw redirect(302, '/dashboard');
	}

	const caseId = params.id;
	const caseReport = await prisma.caseReport.findUnique({
		where: { id: caseId },
		include: {
			patient: true
		}
	});

	if (!caseReport) throw error(404, 'ไม่พบรายงานผู้ป่วย');

	// Load reference data (exclude soft deleted)
	const [masterData, diseases, hospitals, provinces] = await Promise.all([
		prisma.masterData.findMany({ 
			where: { deletedAt: null },
			orderBy: { value: 'asc' } 
		}),
		prisma.disease.findMany({ 
			where: { isActive: true, deletedAt: null }, 
			orderBy: { nameTh: 'asc' } 
		}),
		prisma.hospital.findMany({ 
			where: { deletedAt: null },
			orderBy: { name: 'asc' } 
		}),
		prisma.province.findMany({ 
			where: { deletedAt: null },
			orderBy: { nameTh: 'asc' } 
		})
	]);

	const masterDataByCategory = {
		PREFIX: masterData.filter((m) => m.category === 'PREFIX'),
		OCCUPATION: masterData.filter((m) => m.category === 'OCCUPATION'),
		NATIONALITY: masterData.filter((m) => m.category === 'NATIONALITY'),
		MARITAL_STATUS: masterData.filter((m) => m.category === 'MARITAL_STATUS')
	};

	// Format dates for form (YYYY-MM-DD)
	const formatDate = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';

	// Populate form with existing data
	const formData = {
		patient: {
			idCard: caseReport.patient.idCard || '',
			prefix: caseReport.patient.prefix || '',
			firstName: caseReport.patient.firstName,
			lastName: caseReport.patient.lastName,
			gender: caseReport.patient.gender,
			birthDate: formatDate(caseReport.patient.birthDate),
			nationality: caseReport.patient.nationality || 'ไทย',
			maritalStatus: caseReport.patient.maritalStatus || '',
			occupation: caseReport.patient.occupation || '',
			phone: caseReport.patient.phone || '',
			addressNo: caseReport.patient.addressNo || '',
			moo: caseReport.patient.moo || '',
			road: caseReport.patient.road || '',
			postalCode: caseReport.patient.postalCode || '',
			provinceId: caseReport.patient.provinceId || 0,
			amphoeId: caseReport.patient.amphoeId || 0,
			tambonId: caseReport.patient.tambonId || 0
		},
		// Case Data
		hospitalId: caseReport.hospitalId,
		diseaseId: caseReport.diseaseId,
		illnessDate: formatDate(caseReport.illnessDate),
		treatDate: formatDate(caseReport.treatDate),
		diagnosisDate: formatDate(caseReport.diagnosisDate),
		patientType: caseReport.patientType || 'OPD',
		condition: caseReport.condition || 'UNDER_TREATMENT',
		deathDate: formatDate(caseReport.deathDate),
		causeOfDeath: caseReport.causeOfDeath || '',
		
		useSameAddress: false, // Default to false when editing to show actual saved address
		
		sickAddressNo: caseReport.sickAddressNo || '',
		sickMoo: caseReport.sickMoo || '',
		sickRoad: caseReport.sickRoad || '',
		sickPostalCode: caseReport.sickPostalCode || '',
		sickProvinceId: caseReport.sickProvinceId || 0,
		sickAmphoeId: caseReport.sickAmphoeId || 0,
		sickTambonId: caseReport.sickTambonId || 0,
		
		reporterName: caseReport.reporterName || '',
		remark: caseReport.remark || '',
		treatingHospital: caseReport.treatingHospital || ''
	};

	const form = await superValidate(formData, zod(caseReportSchema));

	return {
		form,
		masterData: masterDataByCategory,
		diseases,
		hospitals,
		provinces,
		// Pass existing patient/case IDs if needed for client-side logic, though form has it conceptually
		caseId
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		console.log('Update action called for case:', params.id);
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const caseId = params.id;
		const form = await superValidate(request, zod(caseReportSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { patient, useSameAddress, ...caseData } = form.data;

		try {
			// Update Patient Info
			// We find the patient associated with this case
			const currentCase = await prisma.caseReport.findUnique({
				where: { id: caseId },
				select: { patientId: true }
			});
			
			if (!currentCase) throw error(404, 'Case not found');

			await prisma.patient.update({
				where: { id: currentCase.patientId },
				data: {
					// idCard: patient.idCard, // Usually shouldn't change ID Card easily, but let's allow if needed or valid
					prefix: patient.prefix,
					firstName: patient.firstName,
					lastName: patient.lastName,
					gender: patient.gender,
					birthDate: patient.birthDate ? new Date(patient.birthDate) : null,
					nationality: patient.nationality,
					maritalStatus: patient.maritalStatus,
					occupation: patient.occupation,
					phone: patient.phone,
					addressNo: patient.addressNo,
					moo: patient.moo,
					road: patient.road,
					postalCode: patient.postalCode,
					provinceId: patient.provinceId || null,
					amphoeId: patient.amphoeId || null,
					tambonId: patient.tambonId || null
				}
			});

			// Calculate age
			const illnessDate = new Date(caseData.illnessDate);
			const birthDate = patient.birthDate ? new Date(patient.birthDate) : illnessDate;
			const ageYears = calculateAge(birthDate, illnessDate);

			// Prepare sick address
			let sickAddress = {
				sickAddressNo: caseData.sickAddressNo,
				sickMoo: caseData.sickMoo,
				sickRoad: caseData.sickRoad,
				sickPostalCode: caseData.sickPostalCode,
				sickProvinceId: caseData.sickProvinceId || null,
				sickAmphoeId: caseData.sickAmphoeId || null,
				sickTambonId: caseData.sickTambonId || null
			};

			if (useSameAddress) {
				sickAddress = {
					sickAddressNo: patient.addressNo,
					sickMoo: patient.moo,
					sickRoad: patient.road,
					sickPostalCode: patient.postalCode,
					sickProvinceId: patient.provinceId,
					sickAmphoeId: patient.amphoeId,
					sickTambonId: patient.tambonId
				};
			}

			// Update Case Report
			const updatedCase = await prisma.caseReport.update({
				where: { id: caseId },
				data: {
					hospitalId: caseData.hospitalId,
					diseaseId: caseData.diseaseId,
					illnessDate: new Date(caseData.illnessDate),
					treatDate: caseData.treatDate ? new Date(caseData.treatDate) : null,
					diagnosisDate: caseData.diagnosisDate ? new Date(caseData.diagnosisDate) : null,
					patientType: caseData.patientType,
					condition: caseData.condition,
					deathDate: caseData.deathDate ? new Date(caseData.deathDate) : null,
					causeOfDeath: caseData.causeOfDeath,
					ageYears,
					...sickAddress,
					reporterName: caseData.reporterName,
					remark: caseData.remark,
					treatingHospital: caseData.treatingHospital || null,
					labResult1: caseData.labResult1 || null,
					labResult2: caseData.labResult2 || null
				},
				include: {
					disease: { select: { nameTh: true, code: true } },
					hospital: { select: { name: true } },
					sickTambon: { select: { nameTh: true } },
					sickAmphoe: { select: { nameTh: true } },
					sickProvince: { select: { nameTh: true } }
				}
			});

			await logAudit(user.id, AuditActions.UPDATE, `${AuditResources.CASE_REPORT}:${updatedCase.id} (${updatedCase.disease.code})`);

			// Send notification
			const { notifyCaseAction } = await import('$lib/server/notifications');
			notifyCaseAction({
				disease: updatedCase.disease.nameTh,
				hospital: updatedCase.hospital.name,
				patientType: updatedCase.patientType,
				condition: updatedCase.condition,
				tambon: updatedCase.sickTambon?.nameTh || null,
				amphoe: updatedCase.sickAmphoe?.nameTh || null,
				province: updatedCase.sickProvince?.nameTh || null,
				action: 'UPDATE',
				userId: user.id,
				caseId: updatedCase.id
			}).catch(err => console.error('Notification error:', err));
		} catch (error) {
			console.error('Error updating case report:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		throw redirect(303, '/dashboard/cases');
	}
};

