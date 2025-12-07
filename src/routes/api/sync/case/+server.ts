import { json, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import type { RequestHandler } from './$types';
import type { OfflineCaseReport } from '$lib/db/offline';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const offlineCase: OfflineCaseReport = await request.json();

		// Find patient - could be UUID from offline or actual patient ID
		let patient = null;
		
		// First try to find by the ID (might be UUID from offline)
		if (offlineCase.patientId) {
			// Check if it's a UUID (offline patient) or actual patient ID
			const isUUID = offlineCase.patientId.includes('-') && offlineCase.patientId.length === 36;
			
			if (isUUID) {
				// This is an offline patient UUID, we need to find the actual patient
				// The patient should have been synced already
				// For now, we'll need to match by other criteria or handle differently
				// This is a limitation - we should sync patients first
				return fail(400, { error: 'Patient not synced yet. Please sync patients first.' });
			} else {
				patient = await prisma.patient.findUnique({
					where: { id: offlineCase.patientId }
				});
			}
		}

		if (!patient) {
			return fail(400, { error: 'Patient not found' });
		}

		// Check for duplicate by clientId (prevent double-insertion from flaky internet)
		let existingCase = null;
		if (offlineCase.clientId) {
			existingCase = await prisma.caseReport.findUnique({
				where: { clientId: offlineCase.clientId }
			});

			if (existingCase) {
				// Case already exists with this clientId
				// Check if this is an UPDATE operation (has updatedAt from client)
				if (offlineCase.updatedAt) {
					// This is an UPDATE operation - check for conflicts
					const clientUpdatedAt = new Date(offlineCase.updatedAt);
					const serverUpdatedAt = existingCase.updatedAt;

					if (serverUpdatedAt > clientUpdatedAt) {
						// Server has newer data - conflict!
						return json(
							{ 
								error: 'Conflict: Server has newer data',
								message: 'The case has been modified on the server since your last sync. Please refresh and try again.',
								caseId: existingCase.id,
								serverUpdatedAt: serverUpdatedAt.toISOString(),
								clientUpdatedAt: clientUpdatedAt.toISOString()
							},
							{ status: 409 }
						);
					}

					// Client data is newer or same - proceed with update
					const updatedCase = await prisma.caseReport.update({
						where: { id: existingCase.id },
						data: {
							patientId: patient.id,
							hospitalId: offlineCase.hospitalId,
							diseaseId: offlineCase.diseaseId,
							illnessDate: offlineCase.illnessDate ? new Date(offlineCase.illnessDate) : null,
							treatDate: offlineCase.treatDate ? new Date(offlineCase.treatDate) : null,
							diagnosisDate: offlineCase.diagnosisDate ? new Date(offlineCase.diagnosisDate) : null,
							patientType: offlineCase.patientType as any,
							condition: offlineCase.condition as any,
							deathDate: offlineCase.deathDate ? new Date(offlineCase.deathDate) : null,
							causeOfDeath: offlineCase.causeOfDeath || undefined,
							ageYears: offlineCase.ageYears,
							sickAddressNo: offlineCase.sickAddressNo || undefined,
							sickMoo: offlineCase.sickMoo || undefined,
							sickRoad: offlineCase.sickRoad || undefined,
							sickProvinceId: offlineCase.sickProvinceId || undefined,
							sickAmphoeId: offlineCase.sickAmphoeId || undefined,
							sickTambonId: offlineCase.sickTambonId || undefined,
							reporterName: offlineCase.reporterName || undefined,
							remark: offlineCase.remark || undefined,
							treatingHospital: offlineCase.treatingHospital || undefined,
							labResult1: offlineCase.labResult1 || undefined,
							labResult2: offlineCase.labResult2 || undefined
						}
					});

					await logAudit(user.id, AuditActions.UPDATE, AuditResources.CASE_REPORT, `Synced update from offline: ${updatedCase.id}`);
					return json({ success: true, caseId: updatedCase.id, message: 'Case updated successfully' });
				} else {
					// CREATE operation - case already exists, return success (idempotent)
					return json({ 
						success: true, 
						caseId: existingCase.id, 
						message: 'Case already exists (duplicate clientId prevented)' 
					});
				}
			}
		}

		// Check if case already exists by other criteria (fallback for cases without clientId)
		if (!existingCase) {
			existingCase = await prisma.caseReport.findFirst({
				where: {
					patientId: patient.id,
					illnessDate: offlineCase.illnessDate ? new Date(offlineCase.illnessDate) : undefined,
					diseaseId: offlineCase.diseaseId,
					deletedAt: null
				}
			});

			if (existingCase) {
				// Case already exists, return success
				return json({ success: true, caseId: existingCase.id, message: 'Case already exists' });
			}
		}

		// CREATE case report (new case)
		const caseReport = await prisma.caseReport.create({
			data: {
				clientId: offlineCase.clientId || undefined, // Store clientId to prevent duplicates
				patientId: patient.id,
				hospitalId: offlineCase.hospitalId,
				diseaseId: offlineCase.diseaseId,
				illnessDate: offlineCase.illnessDate ? new Date(offlineCase.illnessDate) : null,
				treatDate: offlineCase.treatDate ? new Date(offlineCase.treatDate) : null,
				diagnosisDate: offlineCase.diagnosisDate ? new Date(offlineCase.diagnosisDate) : null,
				patientType: offlineCase.patientType as any,
				condition: offlineCase.condition as any,
				deathDate: offlineCase.deathDate ? new Date(offlineCase.deathDate) : null,
				causeOfDeath: offlineCase.causeOfDeath || undefined,
				ageYears: offlineCase.ageYears,
				sickAddressNo: offlineCase.sickAddressNo || undefined,
				sickMoo: offlineCase.sickMoo || undefined,
				sickRoad: offlineCase.sickRoad || undefined,
				sickProvinceId: offlineCase.sickProvinceId || undefined,
				sickAmphoeId: offlineCase.sickAmphoeId || undefined,
				sickTambonId: offlineCase.sickTambonId || undefined,
				reporterName: offlineCase.reporterName || undefined,
				remark: offlineCase.remark || undefined,
				treatingHospital: offlineCase.treatingHospital || undefined,
				labResult1: offlineCase.labResult1 || undefined,
				labResult2: offlineCase.labResult2 || undefined
			}
		});

		// Log audit
		await logAudit(user.id, AuditActions.CREATE, AuditResources.CASE_REPORT, `Synced from offline: ${caseReport.id}`);

		return json({ success: true, caseId: caseReport.id });
	} catch (error: any) {
		console.error('Sync case error:', error);
		return json({ error: error.message || 'Failed to sync case' }, { status: 500 });
	}
};

