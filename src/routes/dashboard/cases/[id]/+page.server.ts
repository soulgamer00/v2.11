import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const caseId = params.id;

	// Get case report with all related data
	const caseReport = await prisma.caseReport.findUnique({
		where: { id: caseId },
		include: {
			patient: {
				include: {
					province: {
						select: { nameTh: true }
					},
					amphoe: {
						select: { nameTh: true }
					},
					tambon: {
						select: { nameTh: true }
					}
				}
			},
			disease: {
				select: {
					id: true,
					code: true,
					nameTh: true,
					nameEn: true,
					abbreviation: true
				}
			},
			hospital: {
				select: {
					id: true,
					name: true,
					code9New: true,
					code9: true
				}
			},
			sickProvince: {
				select: { nameTh: true }
			},
			sickAmphoe: {
				select: { nameTh: true }
			},
			sickTambon: {
				select: { nameTh: true }
			}
		}
	});

	if (!caseReport) {
		throw error(404, 'ไม่พบข้อมูลรายงานเคส');
	}

	// Check if case is soft deleted
	if (caseReport.deletedAt) {
		throw error(404, 'รายงานเคสนี้ถูกลบแล้ว');
	}

	// Check access permissions
	if (user.role === 'USER' && user.hospitalId) {
		// USER can only see cases from their hospital
		if (caseReport.hospitalId !== user.hospitalId) {
			throw error(403, 'ไม่มีสิทธิ์เข้าถึงข้อมูลรายงานเคสนี้');
		}
	}

	return {
		caseReport,
		user
	};
};


