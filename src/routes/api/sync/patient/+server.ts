import { json, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { RequestHandler } from './$types';
import type { OfflinePatient } from '$lib/db/offline';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const offlinePatient: OfflinePatient = await request.json();

		// Check if patient already exists
		let patient = null;
		if (offlinePatient.idCard) {
			patient = await prisma.patient.findUnique({
				where: { idCard: offlinePatient.idCard }
			});
		}

		if (patient) {
			// Patient already exists, return success
			return json({ success: true, patientId: patient.id, message: 'Patient already exists' });
		}

		// Create patient
		patient = await prisma.patient.create({
			data: {
				idCard: offlinePatient.idCard || undefined,
				prefix: offlinePatient.prefix || undefined,
				firstName: offlinePatient.firstName,
				lastName: offlinePatient.lastName,
				gender: offlinePatient.gender as any,
				birthDate: offlinePatient.birthDate ? new Date(offlinePatient.birthDate) : null,
				nationality: offlinePatient.nationality || 'ไทย',
				maritalStatus: offlinePatient.maritalStatus || undefined,
				occupation: offlinePatient.occupation || undefined,
				phone: offlinePatient.phone || undefined,
				addressNo: offlinePatient.addressNo || undefined,
				moo: offlinePatient.moo || undefined,
				road: offlinePatient.road || undefined,
				provinceId: offlinePatient.provinceId || undefined,
				amphoeId: offlinePatient.amphoeId || undefined,
				tambonId: offlinePatient.tambonId || undefined
			}
		});

		// Log audit
		await logAudit(user.id, AuditActions.CREATE, AuditResources.PATIENT, `Synced from offline: ${patient.id}`);

		return json({ success: true, patientId: patient.id });
	} catch (error: any) {
		console.error('Sync patient error:', error);
		return json({ error: error.message || 'Failed to sync patient' }, { status: 500 });
	}
};








