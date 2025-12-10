import { prisma } from './db';

export async function logAudit(
	userId: string,
	action: string,
	resource: string,
	details?: string
): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				userId,
				action,
				resource
			}
		});
	} catch (error) {
		// Don't throw error if audit logging fails
		// Just log to console for debugging
		console.error('Failed to create audit log:', error);
	}
}

// Common audit actions
export const AuditActions = {
	CREATE: 'CREATE',
	UPDATE: 'UPDATE',
	DELETE: 'DELETE',
	SOFT_DELETE: 'SOFT_DELETE',
	RESTORE: 'RESTORE',
	HARD_DELETE: 'HARD_DELETE',
	LOGIN: 'LOGIN',
	LOGOUT: 'LOGOUT',
	EXPORT: 'EXPORT',
	IMPORT: 'IMPORT'
} as const;

// Common resources
export const AuditResources = {
	DISEASE: 'Disease',
	HOSPITAL: 'Hospital',
	OCCUPATION: 'Occupation',
	POPULATION: 'Population',
	PATIENT: 'Patient',
	CASE_REPORT: 'CaseReport',
	USER: 'User',
	SESSION: 'Session',
	SYSTEM_CONFIG: 'SystemConfig'
} as const;

