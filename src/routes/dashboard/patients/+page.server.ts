import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	// Get all patients with case count
	// USER can only see patients from their hospital's cases
	const where: any = { deletedAt: null };
	
	if (user.role === 'USER' && user.hospitalId) {
		// Get patient IDs from cases in user's hospital
		const cases = await prisma.caseReport.findMany({
			where: {
				hospitalId: user.hospitalId,
				deletedAt: null
			},
			select: { patientId: true },
			distinct: ['patientId']
		});
		
		where.id = { in: cases.map((c) => c.patientId) };
	}

	const patients = await prisma.patient.findMany({
		where,
		include: {
			_count: {
				select: { cases: true }
			}
		},
		orderBy: {
			updatedAt: 'desc'
		},
		take: 100 // Limit for performance
	});

	return {
		patients,
		user
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์ลบผู้ป่วย' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			// Get patient first to check if exists
			const patient = await prisma.patient.findUnique({
				where: { id },
				include: {
					_count: {
						select: { cases: true }
					}
				}
			});

			if (!patient) {
				return fail(400, { message: 'ไม่พบข้อมูลผู้ป่วย' });
			}

			// Always soft delete
			await prisma.patient.update({
				where: { id },
				data: { deletedAt: new Date() }
			});

			await logAudit(user.id, AuditActions.SOFT_DELETE, `${AuditResources.PATIENT}:${id}`);
		} catch (error) {
			console.error('Error deleting patient:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

