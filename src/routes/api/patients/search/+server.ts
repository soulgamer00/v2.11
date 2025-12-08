import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q') || '';

	if (!query || query.length < 1) {
		return json([]);
	}

	// Search by ID card or name - more flexible matching
	const isIdCard = /^\d+$/.test(query);
	const queryLower = query.toLowerCase();

	const patients = await prisma.patient.findMany({
		where: {
			deletedAt: null,
			OR: isIdCard
				? [
						{ idCard: { contains: query } },
						{ firstName: { contains: query, mode: 'insensitive' } },
						{ lastName: { contains: query, mode: 'insensitive' } }
				  ]
				: [
						{ firstName: { contains: query, mode: 'insensitive' } },
						{ lastName: { contains: query, mode: 'insensitive' } },
						{ idCard: { contains: query } },
						{ phone: { contains: query } }
				  ]
		},
		select: {
			id: true,
			idCard: true,
			prefix: true,
			firstName: true,
			lastName: true,
			phone: true,
			gender: true,
			birthDate: true,
			nationality: true,
			maritalStatus: true,
			occupation: true,
			addressNo: true,
			moo: true,
			road: true,
			provinceId: true,
			amphoeId: true,
			tambonId: true,
			postalCode: true
		},
		take: 15, // Increased from 10 to show more results
		orderBy: [
			// Prioritize exact matches first
			{ firstName: 'asc' },
			{ lastName: 'asc' },
			{ updatedAt: 'desc' }
		]
	});

	// Sort results to prioritize closer matches
	const sortedPatients = patients.sort((a, b) => {
		const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
		const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();
		
		// Exact match first
		if (aFullName.startsWith(queryLower) && !bFullName.startsWith(queryLower)) return -1;
		if (!aFullName.startsWith(queryLower) && bFullName.startsWith(queryLower)) return 1;
		
		// Contains at start
		if (aFullName.indexOf(queryLower) === 0 && bFullName.indexOf(queryLower) !== 0) return -1;
		if (aFullName.indexOf(queryLower) !== 0 && bFullName.indexOf(queryLower) === 0) return 1;
		
		// Contains anywhere
		if (aFullName.includes(queryLower) && !bFullName.includes(queryLower)) return -1;
		if (!aFullName.includes(queryLower) && bFullName.includes(queryLower)) return 1;
		
		return 0;
	});

	return json(sortedPatients);
};







