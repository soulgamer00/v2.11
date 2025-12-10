import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * API endpoint to load all reference data
 */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['ADMIN', 'SUPERADMIN'])) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [masterData, diseases, hospitals, provinces, amphoes, tambons] = await Promise.all([
		prisma.masterData.findMany({ where: { deletedAt: null } }),
		prisma.disease.findMany({ where: { isActive: true, deletedAt: null } }),
		prisma.hospital.findMany({ where: { deletedAt: null } }),
		prisma.province.findMany({ where: { deletedAt: null } }),
		prisma.amphoe.findMany(),
		prisma.tambon.findMany()
	]);

	return json({
		masterData,
		diseases,
		hospitals,
		provinces,
		amphoes,
		tambons
	});
};



