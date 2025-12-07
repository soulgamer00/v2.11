import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		throw new Error('Unauthorized');
	}

	// Get hospitalId and year from URL parameters (optional)
	const hospitalIdParam = url.searchParams.get('hospitalId');
	const selectedHospitalId = hospitalIdParam ? parseInt(hospitalIdParam) : null;
	
	const yearParam = url.searchParams.get('year');
	const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

	// Build where clause based on user role and selected hospital
	let whereClause: any = { deletedAt: null };
	
	if (user.role === 'USER' && user.hospitalId) {
		// USER can only see their hospital's data
		whereClause.hospitalId = user.hospitalId;
	} else if (selectedHospitalId) {
		// SUPERADMIN/ADMIN can filter by selected hospital
		whereClause.hospitalId = selectedHospitalId;
	}
	// If no hospitalId selected and user is SUPERADMIN/ADMIN, show all (deletedAt: null only)

	// Load hospitals for dropdown (only for SUPERADMIN/ADMIN)
	const hospitals = (user.role === 'SUPERADMIN' || user.role === 'ADMIN')
		? await prisma.hospital.findMany({
			where: { deletedAt: null },
			orderBy: { name: 'asc' }
		})
		: [];

	// Get selected hospital name (for PDF)
	let selectedHospitalName: string | null = null;
	if (selectedHospitalId) {
		const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);
		selectedHospitalName = selectedHospital?.name || null;
	} else if (user.role === 'USER' && user.hospitalId) {
		// For USER, get their hospital name
		const userHospital = await prisma.hospital.findUnique({
			where: { id: user.hospitalId }
		});
		selectedHospitalName = userHospital?.name || null;
	}

	// Get summary (filter by year)
	const yearWhereClause = {
		...whereClause,
		OR: [
			{ illnessDate: { gte: new Date(`${selectedYear}-01-01`), lte: new Date(`${selectedYear}-12-31`) } },
			{ 
				illnessDate: null, 
				createdAt: { gte: new Date(`${selectedYear}-01-01`), lte: new Date(`${selectedYear}-12-31`) } 
			}
		]
	};

	const [totalCases, recovered, underTreatment, died] = await Promise.all([
		prisma.caseReport.count({ where: yearWhereClause }),
		prisma.caseReport.count({ where: { ...yearWhereClause, condition: 'RECOVERED' } }),
		prisma.caseReport.count({ where: { ...yearWhereClause, condition: 'UNDER_TREATMENT' } }),
		prisma.caseReport.count({ where: { ...yearWhereClause, condition: 'DIED' } })
	]);

	// Get all cases for analysis
	const cases = await prisma.caseReport.findMany({
		where: whereClause,
		include: {
			disease: {
				select: {
					nameTh: true,
					abbreviation: true
				}
			}
		}
	});

	// Age distribution (0-10, 11-20, 21-30, 31-40, 41-50, 51-60, 60+)
	const ageDistribution = [0, 0, 0, 0, 0, 0, 0];
	cases.forEach((c) => {
		const age = c.ageYears;
		if (age <= 10) ageDistribution[0]++;
		else if (age <= 20) ageDistribution[1]++;
		else if (age <= 30) ageDistribution[2]++;
		else if (age <= 40) ageDistribution[3]++;
		else if (age <= 50) ageDistribution[4]++;
		else if (age <= 60) ageDistribution[5]++;
		else ageDistribution[6]++;
	});

	// Disease distribution
	const diseaseMap = new Map<string, number>();
	cases.forEach((c) => {
		const diseaseName = c.disease.abbreviation || c.disease.nameTh;
		diseaseMap.set(diseaseName, (diseaseMap.get(diseaseName) || 0) + 1);
	});
	const diseaseDistribution = Array.from(diseaseMap.entries())
		.map(([disease, count]) => ({ disease, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 6);

	// Filter cases by selected year
	const filteredCases = cases.filter((c) => {
		const date = new Date(c.illnessDate || c.createdAt);
		return date.getFullYear() === selectedYear;
	});

	// Monthly trend (selected year)
	const monthlyTrend = Array(12).fill(0);
	filteredCases.forEach((c) => {
		const date = new Date(c.illnessDate || c.createdAt);
		if (date.getFullYear() === selectedYear) {
			monthlyTrend[date.getMonth()]++;
		}
	});

	// Calculate population based on selected hospital and year
	let populationQuery: any = { year: selectedYear };
	if (selectedHospitalId) {
		populationQuery.hospitalId = selectedHospitalId;
	} else if (user.role === 'USER' && user.hospitalId) {
		populationQuery.hospitalId = user.hospitalId;
	}

	const populationRecords = await prisma.population.findMany({
		where: populationQuery
	});

	const totalPopulation = populationRecords.reduce((sum, rec) => sum + rec.amount, 0);
	const population = totalPopulation || 100000; // Default if no data

	// Get available years from population data
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

	const morbidityRates = diseaseDistribution.map((d) => ({
		disease: d.disease,
		cases: d.count,
		population,
		rate: (d.count / population) * 100000
	}));

	return {
		summary: {
			totalCases,
			recovered,
			underTreatment,
			died
		},
		ageDistribution,
		diseaseDistribution,
		monthlyTrend,
		morbidityRates,
		hospitals,
		selectedHospitalId,
		selectedHospitalName,
		selectedYear,
		availableYears,
		population
	};
};



