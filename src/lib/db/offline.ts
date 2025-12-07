import Dexie, { type Table } from 'dexie';

// Offline database schema
export interface OfflineCaseReport {
	id: string;
	clientId: string; // UUID generated on client to prevent duplicate submissions
	patientId: string;
	hospitalId: number;
	diseaseId: number;
	illnessDate?: string;
	treatDate?: string;
	diagnosisDate?: string;
	patientType?: string;
	condition?: string;
	ageYears: number;
	sickAddressNo?: string;
	sickMoo?: string;
	sickRoad?: string;
	sickProvinceId?: number;
	sickAmphoeId?: number;
	sickTambonId?: number;
	reporterName?: string;
	remark?: string;
	treatingHospital?: string; // โรงพยาบาลที่กำลังรักษา (Free text)
	labResult1?: string;
	labResult2?: string;
	syncStatus: 'pending' | 'syncing' | 'synced'; // Sync status tracking
	createdAt: string;
	updatedAt?: string; // For conflict resolution on updates
}

export interface OfflinePatient {
	id: string;
	idCard?: string;
	prefix?: string;
	firstName: string;
	lastName: string;
	gender: string;
	birthDate?: string;
	nationality?: string;
	maritalStatus?: string;
	occupation?: string;
	phone?: string;
	addressNo?: string;
	moo?: string;
	road?: string;
	provinceId?: number;
	amphoeId?: number;
	tambonId?: number;
	synced: boolean;
	createdAt: string;
}

export interface CachedMasterData {
	id: number;
	category: string;
	value: string;
}

export interface CachedDisease {
	id: number;
	code: string;
	nameTh: string;
	nameEn?: string;
	abbreviation?: string;
	isActive: boolean;
}

export interface CachedHospital {
	id: number;
	name: string;
	code9?: string;
	code9New?: string;
	code5?: string;
	type?: string;
}

export interface CachedProvince {
	id: number;
	code: string;
	nameTh: string;
}

export interface CachedAmphoe {
	id: number;
	code: string;
	nameTh: string;
	provinceId: number;
}

export interface CachedTambon {
	id: number;
	code: string;
	nameTh: string;
	amphoeId: number;
}

// Dexie Database
export class VBDOfflineDB extends Dexie {
	offlineCases!: Table<OfflineCaseReport, string>;
	offlinePatients!: Table<OfflinePatient, string>;
	masterData!: Table<CachedMasterData, number>;
	diseases!: Table<CachedDisease, number>;
	hospitals!: Table<CachedHospital, number>;
	provinces!: Table<CachedProvince, number>;
	amphoes!: Table<CachedAmphoe, number>;
	tambons!: Table<CachedTambon, number>;

	constructor() {
		super('VBDOfflineDB');
		
		// Version 1: Initial schema
		this.version(1).stores({
			offlineCases: 'id, patientId, hospitalId, synced, createdAt',
			offlinePatients: 'id, idCard, synced, createdAt',
			masterData: 'id, category',
			diseases: 'id, code, isActive',
			hospitals: 'id, code9',
			provinces: 'id, code',
			amphoes: 'id, code, provinceId',
			tambons: 'id, code, amphoeId'
		});

		// Version 2: Add clientId, syncStatus, updatedAt for robust sync
		this.version(2).stores({
			offlineCases: 'id, clientId, patientId, hospitalId, syncStatus, createdAt',
			offlinePatients: 'id, idCard, synced, createdAt',
			masterData: 'id, category',
			diseases: 'id, code, isActive',
			hospitals: 'id, code9',
			provinces: 'id, code',
			amphoes: 'id, code, provinceId',
			tambons: 'id, code, amphoeId'
		}).upgrade(async (tx) => {
			// Migrate existing cases: convert synced boolean to syncStatus
			// Generate clientId using a simple UUID-like function
			function generateUUID() {
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
					const r = Math.random() * 16 | 0;
					const v = c === 'x' ? r : (r & 0x3 | 0x8);
					return v.toString(16);
				});
			}

			const cases = await tx.table('offlineCases').toCollection().toArray();
			await Promise.all(
				cases.map(async (c: any) => {
					await tx.table('offlineCases').update(c.id, {
						syncStatus: c.synced === true ? 'synced' : 'pending',
						clientId: c.clientId || generateUUID() // Generate clientId for existing records
					});
				})
			);
		});
	}
}

// Create single instance
export const db = new VBDOfflineDB();

/**
 * Cache reference data for offline use
 */
export async function cacheReferenceData(data: {
	masterData: CachedMasterData[];
	diseases: CachedDisease[];
	hospitals: CachedHospital[];
	provinces: CachedProvince[];
	amphoes: CachedAmphoe[];
	tambons: CachedTambon[];
}) {
	await Promise.all([
		db.masterData.bulkPut(data.masterData),
		db.diseases.bulkPut(data.diseases),
		db.hospitals.bulkPut(data.hospitals),
		db.provinces.bulkPut(data.provinces),
		db.amphoes.bulkPut(data.amphoes),
		db.tambons.bulkPut(data.tambons)
	]);
}

/**
 * Get unsynced cases for syncing to server (only pending status)
 */
export async function getUnsyncedCases(): Promise<OfflineCaseReport[]> {
	const allCases = await db.offlineCases.toArray();
	return allCases.filter(c => c.syncStatus === 'pending');
}

/**
 * Get unsynced patients for syncing to server
 */
export async function getUnsyncedPatients(): Promise<OfflinePatient[]> {
	// Use filter instead of where().equals() to avoid IndexedDB key errors with boolean
	const allPatients = await db.offlinePatients.toArray();
	return allPatients.filter(p => p.synced === false);
}

/**
 * Mark case as syncing (before sending request)
 */
export async function markCaseSyncing(id: string): Promise<void> {
	await db.offlineCases.update(id, { syncStatus: 'syncing' });
}

/**
 * Revert case to pending (on sync failure)
 */
export async function revertCaseToPending(id: string): Promise<void> {
	await db.offlineCases.update(id, { syncStatus: 'pending' });
}

/**
 * Delete case after successful sync
 */
export async function deleteCaseAfterSync(id: string): Promise<void> {
	await db.offlineCases.delete(id);
}

/**
 * Mark case as synced (legacy support - now we delete instead)
 * @deprecated Use deleteCaseAfterSync instead
 */
export async function markCaseSynced(id: string): Promise<void> {
	await db.offlineCases.update(id, { syncStatus: 'synced' });
}

/**
 * Mark patient as synced
 */
export async function markPatientSynced(id: string): Promise<void> {
	await db.offlinePatients.update(id, { synced: true });
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
	await Promise.all([
		db.offlineCases.clear(),
		db.offlinePatients.clear(),
		db.masterData.clear(),
		db.diseases.clear(),
		db.hospitals.clear(),
		db.provinces.clear(),
		db.amphoes.clear(),
		db.tambons.clear()
	]);
}

