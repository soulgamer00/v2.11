import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const patientId = params.id;

	// Get patient with all related data
	const patient = await prisma.patient.findUnique({
		where: { id: patientId },
		include: {
			province: {
				select: { nameTh: true }
			},
			amphoe: {
				select: { nameTh: true }
			},
			tambon: {
				select: { nameTh: true }
			},
			cases: {
				where: { deletedAt: null },
				include: {
					disease: {
						select: {
							code: true,
							nameTh: true,
							nameEn: true
						}
					},
					hospital: {
						select: {
							name: true,
							code9New: true
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
				},
				orderBy: { illnessDate: 'desc' }
			}
		}
	});

	if (!patient) {
		throw error(404, 'ไม่พบข้อมูลผู้ป่วย');
	}

	// Check access permissions
	if (user.role === 'USER' && user.hospitalId) {
		// USER can only see patients from their hospital's cases
		const hasAccess = patient.cases.some((c) => c.hospitalId === user.hospitalId);
		if (!hasAccess) {
			throw error(403, 'ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ป่วยนี้');
		}
	}

	return {
		patient
	};
};









