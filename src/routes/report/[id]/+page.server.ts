import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const diseaseId = parseInt(params.id);
	if (isNaN(diseaseId)) throw error(400, 'Invalid disease ID');

	// Get filter params
	const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());
	const provinceId = parseInt(url.searchParams.get('provinceId') || '0');
	const amphoeId = parseInt(url.searchParams.get('amphoeId') || '0');
	const tambonId = parseInt(url.searchParams.get('tambonId') || '0');
	const hospitalId = parseInt(url.searchParams.get('hospitalId') || '0');

	// Fetch Disease Info
	const disease = await prisma.disease.findUnique({
		where: { id: diseaseId }
	});
	if (!disease) throw error(404, 'Disease not found');

	// Build base where clause
	const whereClause: any = {
		diseaseId,
		deletedAt: null,
		OR: [
			{ illnessDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
			{ 
				illnessDate: null, 
				createdAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } 
			}
		]
	};

	// --- Area Filtering Logic ---
	// Priority: Hospital > Tambon > Amphoe > Province
	if (hospitalId) {
		whereClause.hospitalId = hospitalId;
	} else if (tambonId) {
		whereClause.sickTambonId = tambonId;
	} else if (amphoeId) {
		whereClause.sickAmphoeId = amphoeId;
	} else if (provinceId) {
		whereClause.sickProvinceId = provinceId;
	}

	// Fetch Data in Parallel
	const [cases, provinces, amphoes, tambons, hospitals] = await Promise.all([
		prisma.caseReport.findMany({
			where: whereClause,
			include: {
				patient: { select: { gender: true, occupation: true } }
			}
		}),
		prisma.province.findMany({ 
			where: { deletedAt: null },
			orderBy: { nameTh: 'asc' } 
		}),
		// Load amphoes only if province selected
		provinceId ? prisma.amphoe.findMany({ where: { provinceId }, orderBy: { nameTh: 'asc' } }) : [],
		// Load tambons only if amphoe selected
		amphoeId ? prisma.tambon.findMany({ where: { amphoeId }, orderBy: { nameTh: 'asc' } }) : [],
		// Load hospitals (Global list for now, or could be filtered by province if relation existed)
		prisma.hospital.findMany({ orderBy: { name: 'asc' } })
	]);

	// Calculate Population Denominator based on filter level
	// Note: This is an approximation since Population table is linked to Hospital
	let populationQuery: any = { year };
	
	if (hospitalId) {
		populationQuery.hospitalId = hospitalId;
	} 
	// Note: We can't easily filter population by province/amphoe/tambon 
	// because Population table is linked to Hospital, and Hospital doesn't have address fields in current schema.
	// For now, we'll use TOTAL population as fallback or SUM of selected hospitals if filtering by hospital.
	
	const populationRecords = await prisma.population.findMany({
		where: populationQuery
	});

	let totalPopulation = populationRecords.reduce((sum, rec) => sum + rec.amount, 0);
	
	// Fallback if no population found (to avoid div by 0 and insane rates)
	if (totalPopulation === 0) {
		// If filtering by area but no specific hospital population, maybe use a standard estimate or 100k base
		totalPopulation = 100000; 
	}

	// --- Report Calculation ---
	const ageGroups = { '0-4': 0, '5-9': 0, '10-14': 0, '15-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };
	const ageGroupsDied = { '0-4': 0, '5-9': 0, '10-14': 0, '15-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };
	
	cases.forEach(c => {
		const age = c.ageYears;
		const ageKey = age < 5 ? '0-4' :
		              age < 10 ? '5-9' :
		              age < 15 ? '10-14' :
		              age < 25 ? '15-24' :
		              age < 35 ? '25-34' :
		              age < 45 ? '35-44' :
		              age < 55 ? '45-54' :
		              age < 65 ? '55-64' : '65+';
		ageGroups[ageKey]++;
		if (c.condition === 'DIED') {
			ageGroupsDied[ageKey]++;
		}
	});
	
	// Calculate age statistics with morbidity and death rates
	const ageStats = Object.keys(ageGroups).map(ageKey => {
		const count = ageGroups[ageKey];
		const died = ageGroupsDied[ageKey];
		const morbidityRate = totalPopulation > 0 ? ((count / totalPopulation) * 100000).toFixed(2) : '0.00';
		const deathRate = count > 0 ? ((died / count) * 100).toFixed(2) : '0.00';
		return {
			ageGroup: ageKey,
			count,
			died,
			morbidityRate,
			deathRate
		};
	});

	const gender = { MALE: 0, FEMALE: 0 };
	cases.forEach(c => {
		if (c.patient.gender === 'MALE') gender.MALE++;
		else if (c.patient.gender === 'FEMALE') gender.FEMALE++;
	});
	
	// Calculate gender ratio and percentages
	const totalGender = gender.MALE + gender.FEMALE;
	// Calculate ratio as หญิง 1 : ชาย X (where X = MALE / FEMALE)
	const genderRatio = totalGender > 0 && gender.FEMALE > 0
		? (gender.MALE / gender.FEMALE).toFixed(2)
		: gender.MALE > 0 ? '0.00' : '0.00';
	const genderStats = {
		MALE: {
			count: gender.MALE,
			percentage: totalGender > 0 ? ((gender.MALE / totalGender) * 100).toFixed(1) : '0.0'
		},
		FEMALE: {
			count: gender.FEMALE,
			percentage: totalGender > 0 ? ((gender.FEMALE / totalGender) * 100).toFixed(1) : '0.0'
		},
		ratio: genderRatio,
		total: totalGender
	};

	const monthlyCases = Array(12).fill(0);
	cases.forEach(c => {
		const date = c.illnessDate ? new Date(c.illnessDate) : new Date(c.createdAt);
		monthlyCases[date.getMonth()]++;
	});

	const incidenceRate = ((cases.length / totalPopulation) * 100000).toFixed(2);
	const monthlyIncidence = monthlyCases.map(c => ((c / totalPopulation) * 100000).toFixed(2));

	const occupationMap: Record<string, number> = {};
	cases.forEach(c => {
		const occ = c.patient.occupation || 'ไม่ระบุ';
		occupationMap[occ] = (occupationMap[occ] || 0) + 1;
	});
	
	const totalCasesForOccupation = cases.length;
	const occupations = Object.entries(occupationMap)
		.sort((a, b) => b[1] - a[1])
		.map(([name, count]) => ({
			name,
			count,
			percentage: totalCasesForOccupation > 0 ? ((count / totalCasesForOccupation) * 100).toFixed(2) : '0.00'
		}));

	// --- 5 Year Historical Data ---
	const currentYearNum = year;
	const historicalYears = Array.from({ length: 5 }, (_, i) => currentYearNum - i).reverse();
	
	const historicalData = await Promise.all(
		historicalYears.map(async (histYear) => {
			const histWhereClause: any = {
				diseaseId,
				deletedAt: null,
				OR: [
					{ illnessDate: { gte: new Date(`${histYear}-01-01`), lte: new Date(`${histYear}-12-31`) } },
					{ 
						illnessDate: null, 
						createdAt: { gte: new Date(`${histYear}-01-01`), lte: new Date(`${histYear}-12-31`) } 
					}
				]
			};
			
			// Apply same area filters
			if (hospitalId) {
				histWhereClause.hospitalId = hospitalId;
			} else if (tambonId) {
				histWhereClause.sickTambonId = tambonId;
			} else if (amphoeId) {
				histWhereClause.sickAmphoeId = amphoeId;
			} else if (provinceId) {
				histWhereClause.sickProvinceId = provinceId;
			}
			
			const [histCases, histPopulation] = await Promise.all([
				prisma.caseReport.findMany({
					where: histWhereClause,
					select: {
						id: true,
						condition: true
					}
				}),
				prisma.population.findMany({
					where: { year: histYear, ...(hospitalId ? { hospitalId } : {}) }
				})
			]);
			
			const histTotalCases = histCases.length;
			const histDied = histCases.filter(c => c.condition === 'DIED').length;
			const histTotalPopulation = histPopulation.reduce((sum, p) => sum + p.amount, 0) || 100000;
			const histMorbidityRate = histTotalPopulation > 0 
				? ((histTotalCases / histTotalPopulation) * 100000).toFixed(2) 
				: '0.00';
			const histDeathRate = histTotalCases > 0 
				? ((histDied / histTotalCases) * 100).toFixed(2) 
				: '0.00';
			
			return {
				year: histYear,
				totalCases: histTotalCases,
				morbidityRate: histMorbidityRate,
				died: histDied,
				deathRate: histDeathRate
			};
		})
	);

	return {
		user: locals.user,
		disease,
		filters: { year, provinceId, amphoeId, tambonId, hospitalId },
		masterData: { provinces, amphoes, tambons, hospitals },
		stats: {
			totalCases: cases.length,
			totalPopulation,
			incidenceRate
		},
		reports: {
			ageGroups,
			ageStats,
			gender,
			genderStats,
			monthlyCases,
			monthlyIncidence,
			occupations,
			historicalData
		}
	};
};
