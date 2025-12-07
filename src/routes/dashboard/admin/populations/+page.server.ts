import { fail, redirect, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const user = locals.user;

	const selectedYear = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());

	// Get all hospitals with their population for the selected year
	const hospitals = await prisma.hospital.findMany({
		include: {
			populations: {
				where: {
					year: selectedYear
				}
			}
		},
		orderBy: { name: 'asc' }
	});

	// Get available years
	const yearsData = await prisma.population.findMany({
		select: { year: true },
		distinct: ['year'],
		orderBy: { year: 'desc' }
	});

	const availableYears = yearsData.map(y => y.year);
	
	// Add current year if not in list
	const currentYear = new Date().getFullYear();
	if (!availableYears.includes(currentYear)) {
		availableYears.unshift(currentYear);
	}

	// Format data for easy display
	const hospitalData = hospitals.map(h => ({
		id: h.id,
		name: h.name,
		code9: h.code9,
		population: h.populations[0]?.amount || 0,
		populationId: h.populations[0]?.id
	}));

	return {
		hospitals: hospitalData,
		selectedYear,
		availableYears
	};
};

export const actions: Actions = {
	updatePopulations: async ({ request, locals }) => {
		const user = locals.user;
		if (!user || !hasRole(user, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const formData = await request.formData();
		const year = parseInt(formData.get('year')?.toString() || '0');

		if (!year) {
			return fail(400, { message: 'กรุณาระบุปี' });
		}

		try {
			// Get all hospital IDs and amounts from form
			const updates: Array<{ hospitalId: number; amount: number }> = [];

			for (const [key, value] of formData.entries()) {
				if (key.startsWith('amount_')) {
					const hospitalId = parseInt(key.replace('amount_', ''));
					const amount = parseInt(value.toString()) || 0;
					
					if (amount > 0) {
						updates.push({ hospitalId, amount });
					}
				}
			}

			// Update or create populations
			let isCreate = false;
			for (const { hospitalId, amount } of updates) {
				const existing = await prisma.population.findUnique({
					where: {
						hospitalId_year: {
							hospitalId,
							year
						}
					}
				});

				await prisma.population.upsert({
					where: {
						hospitalId_year: {
							hospitalId,
							year
						}
					},
					update: {
						amount
					},
					create: {
						hospitalId,
						year,
						amount
					}
				});

				if (!existing) {
					isCreate = true;
				}
			}

			await logAudit(
				user.id,
				isCreate ? AuditActions.CREATE : AuditActions.UPDATE,
				`${AuditResources.POPULATION}:Year ${year} (${updates.length} hospitals)`
			);

			return { success: true, message: `บันทึกข้อมูลประชากรปี ${year + 543} สำเร็จ` };
		} catch (error) {
			console.error('Population update error:', error);
			return fail(500, { message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}
	}
};

