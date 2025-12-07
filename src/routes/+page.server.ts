import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const diseaseId = parseInt(url.searchParams.get('diseaseId') || '0');
	
	// Base where clause for active cases
	const whereClause = {
		deletedAt: null,
		...(diseaseId ? { diseaseId } : {})
	};

	// 1. Fetch master data & stats in parallel
	const [
		diseases,
		totalCases,
		recovered,
		deaths,
		hospitalCount,
		rawCases
	] = await Promise.all([
		prisma.disease.findMany({
			where: { isActive: true },
			orderBy: { nameTh: 'asc' }
		}),
		prisma.caseReport.count({ where: whereClause }),
		prisma.caseReport.count({ where: { ...whereClause, condition: 'RECOVERED' } }),
		prisma.caseReport.count({ where: { ...whereClause, condition: 'DIED' } }),
		prisma.hospital.count(),
		// Fetch data for charts (optimized select)
		prisma.caseReport.findMany({
			where: whereClause,
			select: {
				illnessDate: true,
				ageYears: true,
				createdAt: true
			}
		})
	]);

	// 2. Process Monthly Trend (Current Year)
	const currentYear = new Date().getFullYear();
	const monthlyTrend = Array(12).fill(0);
	
	rawCases.forEach(c => {
		const date = c.illnessDate ? new Date(c.illnessDate) : new Date(c.createdAt);
		if (date.getFullYear() === currentYear) {
			monthlyTrend[date.getMonth()]++;
		}
	});

	// 3. Process Age Distribution
	const ageDistribution = [0, 0, 0, 0, 0, 0, 0];
	rawCases.forEach(c => {
		const age = c.ageYears;
		if (age <= 10) ageDistribution[0]++;
		else if (age <= 20) ageDistribution[1]++;
		else if (age <= 30) ageDistribution[2]++;
		else if (age <= 40) ageDistribution[3]++;
		else if (age <= 50) ageDistribution[4]++;
		else if (age <= 60) ageDistribution[5]++;
		else ageDistribution[6]++;
	});

	return {
		user: locals.user,
		diseases,
		selectedDiseaseId: diseaseId,
		stats: {
			totalCases,
			recovered,
			deaths,
			hospitalCount,
			mortalityRate: totalCases > 0 ? ((deaths / totalCases) * 100).toFixed(2) : '0.00'
		},
		charts: {
			monthlyTrend,
			ageDistribution
		}
	};
};
