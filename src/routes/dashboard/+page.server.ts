import { prisma } from '$lib/server/db';
import { canAccessHospital } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

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

	// Get statistics
	const [totalCases, casesThisMonth, totalPatients, totalHospitals] = await Promise.all([
		prisma.caseReport.count({ where: whereClause }),
		prisma.caseReport.count({
			where: {
				...whereClause,
				createdAt: {
					gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
				}
			}
		}),
		prisma.patient.count({ where: { deletedAt: null } }),
		prisma.hospital.count()
	]);

	// Get recent cases
	const recentCases = await prisma.caseReport.findMany({
		where: whereClause,
		include: {
			patient: {
				select: {
					prefix: true,
					firstName: true,
					lastName: true
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
		take: 10
	});

	return {
		user,
		stats: {
			totalCases,
			casesThisMonth,
			totalPatients,
			totalHospitals
		},
		recentCases
	};
};







