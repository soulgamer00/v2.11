import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw new Error('Unauthorized');
	}

	// Build where clause based on user role
	const whereClause =
		user.role === 'USER' && user.hospitalId
			? { hospitalId: user.hospitalId, deletedAt: null }
			: { deletedAt: null };

	// Get cases
	const cases = await prisma.caseReport.findMany({
		where: whereClause,
		include: {
			patient: {
				select: {
					idCard: true,
					prefix: true,
					firstName: true,
					lastName: true,
					gender: true
				}
			},
			disease: {
				select: {
					nameTh: true,
					abbreviation: true
				}
			},
			hospital: {
				select: {
					name: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		},
		take: 100 // Limit for performance
	});

	// Get statistics
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay());

	const [casesThisMonth, casesThisWeek] = await Promise.all([
		prisma.caseReport.count({
			where: {
				...whereClause,
				createdAt: { gte: startOfMonth }
			}
		}),
		prisma.caseReport.count({
			where: {
				...whereClause,
				createdAt: { gte: startOfWeek }
			}
		})
	]);

	return {
		cases,
		casesThisMonth,
		casesThisWeek,
		user
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์ลบรายงานเคส' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ไม่พบ ID' });
		}

		try {
			// Get case first to check if exists
			const caseReport = await prisma.caseReport.findUnique({
				where: { id },
				include: {
					disease: { select: { nameTh: true } },
					hospital: { select: { name: true } },
					sickTambon: { select: { nameTh: true } },
					sickAmphoe: { select: { nameTh: true } },
					sickProvince: { select: { nameTh: true } }
				}
			});

			if (!caseReport) {
				return fail(400, { message: 'ไม่พบข้อมูลรายงานเคส' });
			}

			// Soft delete
			await prisma.caseReport.update({
				where: { id },
				data: { deletedAt: new Date() }
			});

			await logAudit(user.id, AuditActions.SOFT_DELETE, `${AuditResources.CASE_REPORT}:${id}`);

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
				action: 'DELETE',
				userId: user.id,
				caseId: id
			}).catch(err => console.error('Notification error:', err));
		} catch (error) {
			console.error('Error deleting case:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};



