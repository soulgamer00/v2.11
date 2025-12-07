import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const amphoeId = parseInt(url.searchParams.get('amphoeId') || '0');

	if (!amphoeId) {
		return json([]);
	}

	const tambons = await prisma.tambon.findMany({
		where: { 
			amphoeId,
			deletedAt: null
		},
		orderBy: { nameTh: 'asc' }
	});

	return json(tambons);
};



