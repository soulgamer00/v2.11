import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const diseaseId = parseInt(url.searchParams.get('diseaseId') || '0');
	
	// Base where clause for active cases
	const whereClause = {
		deletedAt: null,
		...(diseaseId ? { diseaseId } : {})
	};

	const currentYear = new Date().getFullYear();
	const startOfYear = new Date(currentYear, 0, 1);

	// Use transaction to optimize database queries
	const [
		diseases,
		totalCases,
		recovered,
		deaths,
		hospitalCount,
		// Optimized: Only fetch cases from current year for monthly trend
		// Limit to 10,000 records max to prevent memory issues
		rawCasesForCharts
	] = await Promise.all([
		prisma.disease.findMany({
			where: { isActive: true },
			orderBy: { nameTh: 'asc' }
		}),
		prisma.caseReport.count({ where: whereClause }),
		prisma.caseReport.count({ where: { ...whereClause, condition: 'RECOVERED' } }),
		prisma.caseReport.count({ where: { ...whereClause, condition: 'DIED' } }),
		prisma.hospital.count(),
		// Fetch only current year data for charts, limited to prevent huge payloads
		prisma.caseReport.findMany({
			where: {
				...whereClause,
				OR: [
					{ illnessDate: { gte: startOfYear } },
					{ createdAt: { gte: startOfYear } }
				]
			},
			select: {
				illnessDate: true,
				ageYears: true,
				createdAt: true
			},
			take: 10000 // Safety limit to prevent browser crashes
		})
	]);

	// 2. Process Monthly Trend (Current Year)
	const monthlyTrend = Array(12).fill(0);
	
	rawCasesForCharts.forEach(c => {
		const date = c.illnessDate ? new Date(c.illnessDate) : new Date(c.createdAt);
		if (date.getFullYear() === currentYear) {
			monthlyTrend[date.getMonth()]++;
		}
	});

	// 3. Process Age Distribution (using same limited dataset)
	const ageDistribution = [0, 0, 0, 0, 0, 0, 0];
	rawCasesForCharts.forEach(c => {
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
