import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const provinceId = parseInt(url.searchParams.get('provinceId') || '0');

	if (!provinceId) {
		return json([]);
	}

	const amphoes = await prisma.amphoe.findMany({
		where: { 
			provinceId,
			deletedAt: null
		},
		orderBy: { nameTh: 'asc' }
	});

	return json(amphoes);
};



