import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN', 'USER'])) {
		throw redirect(302, '/dashboard');
	}

	// Get reference data for import
	const [diseases, hospitals] = await Promise.all([
		prisma.disease.findMany({
			where: { deletedAt: null, isActive: true },
			orderBy: { nameTh: 'asc' }
		}),
		prisma.hospital.findMany({
			orderBy: { name: 'asc' }
		})
	]);

	return {
		diseases,
		hospitals
	};
};




