import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { caseReportSchema } from '$lib/schemas/case';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import { calculateAge } from '$lib/utils/date';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		throw redirect(302, '/dashboard');
	}

	// Load reference data (exclude soft deleted)
	const [masterData, diseases, allHospitals, provinces] = await Promise.all([
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

	// Filter hospitals based on user role
	// If ADMIN with hospitalId, only show their hospital
	let hospitals = allHospitals;
	let lockedHospitalId: number | null = null;
	
	if (user.role === 'ADMIN' && user.hospitalId) {
		hospitals = allHospitals.filter(h => h.id === user.hospitalId);
		lockedHospitalId = user.hospitalId;
	}

	// Group master data by category
	const masterDataByCategory = {
		PREFIX: masterData.filter((m) => m.category === 'PREFIX'),
		OCCUPATION: masterData.filter((m) => m.category === 'OCCUPATION'),
		NATIONALITY: masterData.filter((m) => m.category === 'NATIONALITY'),
		MARITAL_STATUS: masterData.filter((m) => m.category === 'MARITAL_STATUS')
	};

	const form = await superValidate(zod(caseReportSchema));
	
	// Set default hospitalId for ADMIN with hospitalId
	if (lockedHospitalId && !form.data.hospitalId) {
		form.data.hospitalId = lockedHospitalId;
	}

	return {
		form,
		masterData: masterDataByCategory,
		diseases,
		hospitals,
		provinces,
		lockedHospitalId,
		user
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(caseReportSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Lock hospitalId for ADMIN with hospitalId
		if (user.role === 'ADMIN' && user.hospitalId) {
			form.data.hospitalId = user.hospitalId;
		}

		const { patient, useSameAddress, ...caseData } = form.data;

		try {
			// Check if patient exists by ID Card
			let existingPatient = null;
			if (patient.idCard && patient.idCard.length === 13) {
				existingPatient = await prisma.patient.findUnique({
					where: { idCard: patient.idCard }
				});
			}

			// Create or update patient
			const patientRecord = existingPatient
				? await prisma.patient.update({
						where: { id: existingPatient.id },
						data: {
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
							provinceId: patient.provinceId,
							amphoeId: patient.amphoeId,
							tambonId: patient.tambonId
						}
				  })
				: await prisma.patient.create({
						data: {
							idCard: patient.idCard || undefined,
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
							provinceId: patient.provinceId,
							amphoeId: patient.amphoeId,
							tambonId: patient.tambonId
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
				sickProvinceId: caseData.sickProvinceId,
				sickAmphoeId: caseData.sickAmphoeId,
				sickTambonId: caseData.sickTambonId
			};

			// If using same address, copy from patient
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

			// Create case report
			const caseReport = await prisma.caseReport.create({
				data: {
					patientId: patientRecord.id,
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
					disease: { select: { nameTh: true } },
					hospital: { select: { name: true } },
					sickTambon: { select: { nameTh: true } },
					sickAmphoe: { select: { nameTh: true } },
					sickProvince: { select: { nameTh: true } }
				}
			});

			// Send notification
			const { notifyCaseAction } = await import('$lib/server/notifications');
			notifyCaseAction({
				disease: caseReport.disease.nameTh,
				hospital: caseReport.hospital.name,
				patientType: caseReport.patientType,
				condition: caseReport.condition,
				tambon: caseReport.sickTambon?.nameTh || null,
				amphoe: caseReport.sickAmphoe?.nameTh || null,
				province: caseReport.sickProvince?.nameTh || null,
				action: 'CREATE',
				userId: user.id,
				caseId: caseReport.id
			}).catch(err => console.error('Notification error:', err));
		} catch (error) {
			console.error('Error creating case report:', error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		throw redirect(303, '/dashboard/cases');
	}
};

