import { fail, redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const category = url.searchParams.get('category') || 'all';

	// Fetch deleted data by category
	let deletedPatients: any[] = [];
	let deletedCases: any[] = [];
	let deletedDiseases: any[] = [];
	let deletedHospitals: any[] = [];
	let deletedMasterData: any[] = [];

	if (category === 'all' || category === 'patients') {
		deletedPatients = await prisma.patient.findMany({
			where: { deletedAt: { not: null } },
			include: {
				_count: {
					select: { cases: true }
				}
			},
			orderBy: { deletedAt: 'desc' },
			take: 50
		});
	}

	if (category === 'all' || category === 'cases') {
		deletedCases = await prisma.caseReport.findMany({
			where: { deletedAt: { not: null } },
			include: {
				patient: {
					select: {
						firstName: true,
						lastName: true,
						idCard: true
					}
				},
				disease: {
					select: {
						nameTh: true,
						code: true
					}
				},
				hospital: {
					select: {
						name: true
					}
				}
			},
			orderBy: { deletedAt: 'desc' },
			take: 50
		});
	}

	if (category === 'all' || category === 'diseases') {
		// Show diseases that are soft deleted
		deletedDiseases = await prisma.disease.findMany({
			where: { deletedAt: { not: null } },
			include: {
				_count: {
					select: { cases: true }
				}
			},
			orderBy: { deletedAt: 'desc' },
			take: 50
		});
	}

	if (category === 'all' || category === 'hospitals') {
		deletedHospitals = await prisma.hospital.findMany({
			where: { deletedAt: { not: null } },
			include: {
				_count: {
					select: {
						users: true,
						cases: true
					}
				}
			},
			orderBy: { deletedAt: 'desc' },
			take: 50
		});
	}

	if (category === 'all' || category === 'masterdata') {
		deletedMasterData = await prisma.masterData.findMany({
			where: { deletedAt: { not: null } },
			orderBy: { deletedAt: 'desc' },
			take: 50
		});
	}

	return {
		deletedPatients,
		deletedCases,
		deletedDiseases,
		deletedHospitals,
		deletedMasterData,
		category
	};
};

export const actions: Actions = {
	restorePatient: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			const patient = await prisma.patient.update({
				where: { id },
				data: { deletedAt: null }
			});

			await logAudit(user.id, AuditActions.RESTORE, `${AuditResources.PATIENT}:${patient.id}`);
		} catch (error) {
			console.error('Error restoring patient:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
		}

		return { success: true };
	},

	restoreCase: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			const caseReport = await prisma.caseReport.update({
				where: { id },
				data: { deletedAt: null }
			});

			await logAudit(user.id, AuditActions.RESTORE, `${AuditResources.CASE_REPORT}:${caseReport.id}`);
		} catch (error) {
			console.error('Error restoring case:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
		}

		return { success: true };
	},

	restoreDisease: async ({ request, locals }) => {
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
			const disease = await prisma.disease.update({
				where: { id },
				data: {
					deletedAt: null,
					isActive: true
				}
			});

			await logAudit(user.id, AuditActions.RESTORE, `${AuditResources.DISEASE}:${disease.code}`);
		} catch (error) {
			console.error('Error restoring disease:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
		}

		return { success: true };
	},

	hardDeletePatient: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			// Check if patient has cases
			const caseCount = await prisma.caseReport.count({
				where: { patientId: id }
			});

			if (caseCount > 0) {
				return fail(400, { message: `ไม่สามารถลบถาวรได้ เนื่องจากมีรายงานเคส ${caseCount} รายการ` });
			}

			const patient = await prisma.patient.findUnique({ where: { id } });
			await prisma.patient.delete({
				where: { id }
			});

			if (patient) {
				await logAudit(user.id, AuditActions.HARD_DELETE, `${AuditResources.PATIENT}:${patient.id}`);
			}
		} catch (error) {
			console.error('Error hard deleting patient:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบถาวร' });
		}

		return { success: true };
	},

	hardDeleteCase: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			const caseReport = await prisma.caseReport.findUnique({ where: { id } });
			await prisma.caseReport.delete({
				where: { id }
			});

			if (caseReport) {
				await logAudit(user.id, AuditActions.HARD_DELETE, `${AuditResources.CASE_REPORT}:${caseReport.id}`);
			}
		} catch (error) {
			console.error('Error hard deleting case:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบถาวร' });
		}

		return { success: true };
	},

	hardDeleteDisease: async ({ request, locals }) => {
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
			// Check if disease is used
			const caseCount = await prisma.caseReport.count({
				where: { diseaseId: id }
			});

			if (caseCount > 0) {
				return fail(400, { message: `ไม่สามารถลบถาวรได้ เนื่องจากมีการใช้งาน ${caseCount} รายการ` });
			}

			const disease = await prisma.disease.findUnique({ where: { id } });
			await prisma.disease.delete({
				where: { id }
			});

			if (disease) {
				await logAudit(user.id, AuditActions.HARD_DELETE, `${AuditResources.DISEASE}:${disease.code}`);
			}
		} catch (error) {
			console.error('Error hard deleting disease:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบถาวร' });
		}

		return { success: true };
	},

	restoreHospital: async ({ request, locals }) => {
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
			const hospital = await prisma.hospital.update({
				where: { id },
				data: { deletedAt: null }
			});

			await logAudit(user.id, AuditActions.RESTORE, `${AuditResources.HOSPITAL}:${hospital.code9New || hospital.code9 || hospital.id}`);
		} catch (error) {
			console.error('Error restoring hospital:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
		}

		return { success: true };
	},

	restoreMasterData: async ({ request, locals }) => {
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
			const masterData = await prisma.masterData.update({
				where: { id },
				data: { deletedAt: null }
			});

			await logAudit(user.id, AuditActions.RESTORE, `${masterData.category}:${masterData.value}`);
		} catch (error) {
			console.error('Error restoring masterdata:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล' });
		}

		return { success: true };
	},

	hardDeleteHospital: async ({ request, locals }) => {
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
			// Check if hospital has users or cases
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

			if (hospital._count.users > 0 || hospital._count.cases > 0) {
				return fail(400, { message: `ไม่สามารถลบถาวรได้ เนื่องจากมีการใช้งานอยู่` });
			}

			await prisma.hospital.delete({
				where: { id }
			});

			await logAudit(user.id, AuditActions.HARD_DELETE, `${AuditResources.HOSPITAL}:${hospital.code9New || hospital.code9 || hospital.id}`);
		} catch (error) {
			console.error('Error hard deleting hospital:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบถาวร' });
		}

		return { success: true };
	},

	hardDeleteMasterData: async ({ request, locals }) => {
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
			const masterData = await prisma.masterData.findUnique({ where: { id } });
			if (!masterData) {
				return fail(400, { message: 'ไม่พบข้อมูล' });
			}

			await prisma.masterData.delete({
				where: { id }
			});

			await logAudit(user.id, AuditActions.HARD_DELETE, `${masterData.category}:${masterData.value}`);
		} catch (error) {
			console.error('Error hard deleting masterdata:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบถาวร' });
		}

		return { success: true };
	}
};

