import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q') || '';

	if (!query || query.length < 2) {
		return json([]);
	}

	// Search by ID card or name
	const isIdCard = /^\d+$/.test(query);

	const patients = await prisma.patient.findMany({
		where: {
			deletedAt: null,
			OR: isIdCard
				? [{ idCard: { contains: query } }]
				: [
						{ firstName: { contains: query, mode: 'insensitive' } },
						{ lastName: { contains: query, mode: 'insensitive' } }
				  ]
		},
		take: 10,
		orderBy: {
			updatedAt: 'desc'
		}
	});

	return json(patients);
};




