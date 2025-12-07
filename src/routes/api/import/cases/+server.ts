import { fail, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import { checkRateLimit, RateLimitConfigs } from '$lib/server/rateLimit';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, getClientAddress, url }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting for import
	const rateLimitResult = checkRateLimit(
		{ getClientAddress, url },
		RateLimitConfigs.IMPORT
	);

	if (rateLimitResult) {
		return json(rateLimitResult.body, { status: rateLimitResult.status });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ error: 'ไม่พบไฟล์' }, { status: 400 });
		}

		// Read file
		const arrayBuffer = await file.arrayBuffer();
		const workbook = XLSX.read(arrayBuffer, { type: 'array' });
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		
		// Try to read as JSON first (with headers), if that fails, read as array (tab-separated)
		let data: any[] = [];
		try {
			data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
			// If no headers detected or first row looks like data, try reading as array
			if (data.length > 0 && (Object.keys(data[0]).length === 0 || Object.keys(data[0]).every(k => !isNaN(Number(k))))) {
				data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[];
			}
		} catch (e) {
			// Fallback to array format
			data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[];
		}

		if (data.length === 0) {
			return json({ error: 'ไฟล์ไม่มีข้อมูล' }, { status: 400 });
		}

		// Limit import to 100 rows maximum
		const MAX_ROWS = 100;
		if (data.length > MAX_ROWS) {
			return json({ 
				error: `ไฟล์มีข้อมูลเกิน ${MAX_ROWS} แถว (พบ ${data.length} แถว) กรุณาแบ่งไฟล์ออกเป็นหลายไฟล์หรือลดจำนวนแถวลง` 
			}, { status: 400 });
		}

		// Get reference data (exclude soft deleted)
		const [diseases, hospitals, masterData] = await Promise.all([
			prisma.disease.findMany({ where: { deletedAt: null, isActive: true } }),
			prisma.hospital.findMany({ where: { deletedAt: null } }),
			prisma.masterData.findMany({ where: { deletedAt: null } })
		]);

		const diseaseMap = new Map(diseases.map((d) => [d.code, d]));
		const hospitalMap = new Map(
			hospitals.map((h) => [
				h.code9New || h.code9 || h.id.toString(),
				h
			])
		);

		const errors: string[] = [];
		let successCount = 0;
		let processedCount = 0;

		// Helper function to parse Thai date (DD/MM/YYYY or DD/MM/YYYY with Buddhist era)
		// Also handles Excel date serial numbers
		function parseThaiDate(dateStr: string | number | undefined): Date | null {
			if (dateStr === null || dateStr === undefined || dateStr === '') return null;
			
			// Handle Excel date serial number (days since 1900-01-01)
			if (typeof dateStr === 'number') {
				// Excel date serial number
				const excelEpoch = new Date(1899, 11, 30); // Excel epoch is 1899-12-30
				const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
				if (!isNaN(date.getTime())) {
					return date;
				}
				return null;
			}
			
			const trimmed = dateStr.toString().trim();
			if (!trimmed) return null;
			
			// Handle DD/MM/YYYY format (Thai date)
			if (trimmed.includes('/')) {
				const parts = trimmed.split('/');
				if (parts.length === 3) {
					const day = parseInt(parts[0]);
					const month = parseInt(parts[1]) - 1; // Month is 0-indexed
					let year = parseInt(parts[2]);
					
					// Convert Buddhist era to AD
					// If year is between 2400-2600, assume it's Buddhist era
					if (year >= 2400 && year <= 2600) {
						year = year - 543;
					}
					// If year is between 1900-2100, assume it's already AD
					// Otherwise, if year > 2100, assume it's Buddhist era
					else if (year > 2100) {
						year = year - 543;
					}
					
					const date = new Date(year, month, day);
					if (!isNaN(date.getTime())) {
						return date;
					}
				}
			}
			
			// Try parsing as standard Date (ISO format, etc.)
			const parsed = new Date(trimmed);
			if (!isNaN(parsed.getTime())) {
				// Check if the parsed date seems reasonable (between 1900-2100)
				const year = parsed.getFullYear();
				if (year >= 1900 && year <= 2100) {
					return parsed;
				}
				// If year seems like Buddhist era, convert it
				if (year > 2100 && year <= 2600) {
					return new Date(year - 543, parsed.getMonth(), parsed.getDate());
				}
			}
			
			return null;
		}

		// Process each row
		for (let i = 0; i < data.length; i++) {
			const row = data[i];
			processedCount++;

			try {
				// Map Excel columns to our data structure (supporting both object and array format)
				let rowData: any = row;
				
				// If row is an array (tab-separated), map to object based on column order
				if (Array.isArray(row)) {
					rowData = {
						'เลขบัตรประจำตัวประชาชน': row[0],
						'คำนำหน้าชื่อ': row[1],
						'ชื่อ': row[2],
						'นามสกุล': row[3],
						'เพศ': row[4],
						'อายุปี': row[5],
						'วัน/เดือน/ปีเกิด': row[6],
						'สถานภาพสมรส': row[7],
						'สัญชาติ': row[8],
						'อาชีพ': row[9],
						'เบอร์โทรศัพท์': row[10],
						'บ้านเลขที่': row[11],
						'หมู่ที่': row[12],
						'ถนน': row[13],
						'จังหวัด': row[14],
						'อำเภอ/เขต': row[15],
						'ตำบล/แขวง': row[16],
						'บ้านเลขที่ (ขณะป่วย)': row[17],
						'หมู่ที่ (ขณะป่วย)': row[18],
						'ถนน (ขณะป่วย)': row[19],
						'จังหวัด (ขณะป่วย)': row[20],
						'อำเภอ/เขต (ขณะป่วย)': row[21],
						'ตำบล/แขวง (ขณะป่วย)': row[22],
						'ชื่อโรค': row[23],
						'เขตพื้นที่รักษาตัว': row[24],
						'โรงพยาบาลที่กำลังรักษา': row[25],
						'วันที่เริ่มมีอาการ': row[26],
						'วันที่เริ่มรักษา': row[27],
						'วันที่วินิจฉัยโรค': row[28],
						'Diagnosis ICD-10': row[29],
						'ประเภทผู้ป่วย': row[30],
						'สภาพผู้ป่วย': row[31],
					'วันที่เสียชีวิต': row[32],
					'สาเหตุการเสียชีวิต': row[33],
					'ผลแลป 1': row[34],
					'ผลแลป 2': row[35],
					'หมายเหตุ': row[36],
					'จังหวัดที่รับรักษา': row[37],
					'ชื่อผู้รายงาน': row[38]
					};
				}
				
				const idCard = rowData['เลขบัตรประจำตัวประชาชน']?.toString()?.trim() || rowData['เลขบัตรประชาชน']?.toString()?.trim() || '';
				const firstName = rowData['ชื่อ']?.toString()?.trim() || '';
				const lastName = rowData['นามสกุล']?.toString()?.trim() || '';
				const diseaseCode = rowData['Diagnosis ICD-10']?.toString()?.trim() || rowData['รหัสโรค']?.toString()?.trim() || '';
				const diseaseName = rowData['ชื่อโรค']?.toString()?.trim() || '';
				const hospitalName = rowData['โรงพยาบาลที่กำลังรักษา']?.toString()?.trim() || rowData['หน่วยงาน']?.toString()?.trim() || '';
				const hospitalCode = rowData['รหัสหน่วยงาน']?.toString()?.trim() || '';

				if (!firstName || !lastName) {
					errors.push(`แถว ${i + 2}: ไม่พบชื่อหรือนามสกุล`);
					continue;
				}

				if (!diseaseCode) {
					errors.push(`แถว ${i + 2}: ไม่พบรหัสโรค (Diagnosis ICD-10)`);
					continue;
				}

				// Find disease by code or name
				let disease = diseaseCode ? diseaseMap.get(diseaseCode) : null;
				if (!disease && diseaseName) {
					disease = diseases.find((d) => d.nameTh === diseaseName || d.nameEn === diseaseName);
				}
				if (!disease) {
					errors.push(`แถว ${i + 2}: ไม่พบโรค ${diseaseCode || diseaseName}`);
					continue;
				}

				// Find hospital by code, name, or "เขตพื้นที่รักษาตัว"
				let hospital = hospitalCode ? hospitalMap.get(hospitalCode) : null;
				if (!hospital && hospitalName) {
					hospital = hospitals.find((h) => h.name === hospitalName);
				}
				// If still not found, try "เขตพื้นที่รักษาตัว" field
				if (!hospital) {
					const treatmentArea = rowData['เขตพื้นที่รักษาตัว']?.toString()?.trim() || '';
					if (treatmentArea) {
						hospital = hospitals.find((h) => h.name === treatmentArea);
					}
				}
				if (!hospital) {
					errors.push(`แถว ${i + 2}: ไม่พบหน่วยงาน (${hospitalCode || hospitalName || rowData['เขตพื้นที่รักษาตัว']})`);
					continue;
				}

				// Find or create patient
				let patient = null;
				if (idCard) {
					patient = await prisma.patient.findUnique({
						where: { idCard }
					});
				}

				if (!patient) {
					// Create new patient
					const prefixValue = rowData['คำนำหน้าชื่อ']?.toString()?.trim() || rowData['คำนำหน้า']?.toString()?.trim() || '';
					const prefix = masterData.find((m) => m.category === 'PREFIX' && m.value === prefixValue)?.value || prefixValue || undefined;
					
					const genderStr = rowData['เพศ']?.toString()?.trim() || '';
					const gender = genderStr === 'ชาย' || genderStr === 'MALE' ? 'MALE' : genderStr === 'หญิง' || genderStr === 'FEMALE' ? 'FEMALE' : undefined;
					
					// Parse birth date - handle Thai date format (DD/MM/YYYY with Buddhist era)
					const birthDate = parseThaiDate(rowData['วัน/เดือน/ปีเกิด'] || rowData['วันเกิด']);

					const maritalStatusValue = rowData['สถานภาพสมรส']?.toString()?.trim() || rowData['สถานภาพ']?.toString()?.trim() || '';
					const maritalStatus = masterData.find((m) => m.category === 'MARITAL_STATUS' && m.value === maritalStatusValue)?.value || maritalStatusValue || undefined;
					
					const occupationValue = rowData['อาชีพ']?.toString()?.trim() || '';
					const occupation = masterData.find((m) => m.category === 'OCCUPATION' && m.value === occupationValue)?.value || occupationValue || undefined;

					// Get address data
					const addressNo = rowData['บ้านเลขที่']?.toString()?.trim() || undefined;
					const moo = rowData['หมู่ที่']?.toString()?.trim() || undefined;
					const road = rowData['ถนน']?.toString()?.trim() || undefined;
					
					// Find geo IDs from names
					const provinceName = rowData['จังหวัด']?.toString()?.trim() || '';
					const amphoeName = rowData['อำเภอ/เขต']?.toString()?.trim() || '';
					const tambonName = rowData['ตำบล/แขวง']?.toString()?.trim() || '';

					let provinceId = null;
					let amphoeId = null;
					let tambonId = null;

					if (provinceName) {
						const province = await prisma.province.findFirst({ where: { nameTh: provinceName } });
						if (province) {
							provinceId = province.id;
							if (amphoeName) {
								const amphoe = await prisma.amphoe.findFirst({
									where: { nameTh: amphoeName, provinceId: province.id }
								});
								if (amphoe) {
									amphoeId = amphoe.id;
									if (tambonName) {
										const tambon = await prisma.tambon.findFirst({
											where: { nameTh: tambonName, amphoeId: amphoe.id }
										});
										if (tambon) {
											tambonId = tambon.id;
										}
									}
								}
							}
						}
					}

					patient = await prisma.patient.create({
						data: {
							idCard: idCard || undefined,
							prefix,
							firstName,
							lastName,
							gender: gender || 'MALE',
							birthDate,
							nationality: rowData['สัญชาติ']?.toString()?.trim() || 'ไทย',
							maritalStatus,
							occupation,
							phone: rowData['เบอร์โทรศัพท์']?.toString()?.trim() || rowData['เบอร์โทร']?.toString()?.trim() || undefined,
							addressNo,
							moo,
							road,
							provinceId: provinceId || undefined,
							amphoeId: amphoeId || undefined,
							tambonId: tambonId || undefined
						}
					});
				}

				// Parse dates - handle Thai date format (DD/MM/YYYY with Buddhist era)
				const illnessDate = parseThaiDate(rowData['วันที่เริ่มมีอาการ'] || rowData['วันที่เริ่มป่วย']);
				
				if (!illnessDate) {
					errors.push(`แถว ${i + 2}: ไม่พบวันที่เริ่มมีอาการ`);
					continue;
				}

				// Calculate age - prioritize age from Excel, otherwise calculate from dates
				// Both birthDate and illnessDate should be in AD (Christian era) after parseThaiDate
				let ageYears = 0;
				const ageFromExcel = rowData['อายุปี']?.toString()?.trim();
				
				if (ageFromExcel && !isNaN(parseInt(ageFromExcel)) && parseInt(ageFromExcel) > 0) {
					// Use age from Excel if available
					ageYears = parseInt(ageFromExcel);
				} else if (patient.birthDate && illnessDate) {
					// Calculate from dates (both should be in AD)
					const birth = new Date(patient.birthDate);
					const illness = illnessDate;
					
					// Calculate age in years accurately
					let years = illness.getFullYear() - birth.getFullYear();
					const monthDiff = illness.getMonth() - birth.getMonth();
					const dayDiff = illness.getDate() - birth.getDate();
					
					// Adjust if birthday hasn't occurred yet this year
					if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
						years--;
					}
					
					ageYears = years;
					
					// Validate calculated age (should be reasonable)
					if (ageYears < 0 || ageYears > 150) {
						// If calculated age is unreasonable, default to 0
						ageYears = 0;
					}
				}

				// Parse other dates
				const treatDate = parseThaiDate(rowData['วันที่เริ่มรักษา'] || rowData['วันที่รับการรักษา']);
				const diagnosisDate = parseThaiDate(rowData['วันที่วินิจฉัยโรค'] || rowData['วันที่วินิจฉัย']);
				const deathDate = parseThaiDate(rowData['วันที่เสียชีวิต']);

				// Get sick address
				const sickAddressNo = rowData['บ้านเลขที่ (ขณะป่วย)']?.toString()?.trim() || undefined;
				const sickMoo = rowData['หมู่ที่ (ขณะป่วย)']?.toString()?.trim() || undefined;
				const sickRoad = rowData['ถนน (ขณะป่วย)']?.toString()?.trim() || undefined;
				const sickProvinceName = rowData['จังหวัด (ขณะป่วย)']?.toString()?.trim() || '';
				const sickAmphoeName = rowData['อำเภอ/เขต (ขณะป่วย)']?.toString()?.trim() || '';
				const sickTambonName = rowData['ตำบล/แขวง (ขณะป่วย)']?.toString()?.trim() || '';

				let sickProvinceId = null;
				let sickAmphoeId = null;
				let sickTambonId = null;

				if (sickProvinceName) {
					const province = await prisma.province.findFirst({ where: { nameTh: sickProvinceName } });
					if (province) {
						sickProvinceId = province.id;
						if (sickAmphoeName) {
							const amphoe = await prisma.amphoe.findFirst({
								where: { nameTh: sickAmphoeName, provinceId: province.id }
							});
							if (amphoe) {
								sickAmphoeId = amphoe.id;
								if (sickTambonName) {
									const tambon = await prisma.tambon.findFirst({
										where: { nameTh: sickTambonName, amphoeId: amphoe.id }
									});
									if (tambon) {
										sickTambonId = tambon.id;
									}
								}
							}
						}
					}
				}

				// Parse patient type and condition
				const patientTypeStr = rowData['ประเภทผู้ป่วย']?.toString()?.trim() || '';
				let patientType = null;
				if (patientTypeStr.includes('ผู้ป่วยใน') || patientTypeStr === 'IPD' || patientTypeStr === 'ผู้ป่วยใน') {
					patientType = 'IPD';
				} else if (patientTypeStr.includes('ผู้ป่วยนอก') || patientTypeStr === 'OPD' || patientTypeStr === 'ผู้ป่วยนอก') {
					patientType = 'OPD';
				} else if (patientTypeStr === 'ACF') {
					patientType = 'ACF';
				}

				const conditionStr = rowData['สภาพผู้ป่วย']?.toString()?.trim() || rowData['สถานะ']?.toString()?.trim() || '';
				let condition = null;
				if (conditionStr.includes('หายแล้ว') || conditionStr === 'RECOVERED' || conditionStr.includes('หาย') || conditionStr.includes('ฟื้น')) {
					condition = 'RECOVERED';
				} else if (conditionStr.includes('เสียชีวิต') || conditionStr === 'DIED' || conditionStr.includes('ตาย')) {
					condition = 'DIED';
				} else if (conditionStr.includes('รักษา') || conditionStr === 'UNDER_TREATMENT' || conditionStr.includes('อยู่ระหว่าง') || conditionStr.includes('ระหว่างการรักษา')) {
					condition = 'UNDER_TREATMENT';
				}

				// Create case report
				const caseReport = await prisma.caseReport.create({
					data: {
						patientId: patient.id,
						hospitalId: hospital.id,
						diseaseId: disease.id,
						illnessDate,
						treatDate,
						diagnosisDate,
						patientType,
						condition,
						deathDate,
						causeOfDeath: rowData['สาเหตุการเสียชีวิต']?.toString()?.trim() || undefined,
						ageYears,
						sickAddressNo,
						sickMoo,
						sickRoad,
						sickProvinceId: sickProvinceId || undefined,
						sickAmphoeId: sickAmphoeId || undefined,
						sickTambonId: sickTambonId || undefined,
						sickPostalCode: rowData['รหัสไปรษณีย์ (ขณะป่วย)']?.toString()?.trim() || undefined,
						reporterName: rowData['ชื่อผู้รายงาน']?.toString()?.trim() || rowData['ผู้รายงาน']?.toString()?.trim() || undefined,
						remark: rowData['หมายเหตุ']?.toString()?.trim() || undefined,
						treatingHospital: rowData['โรงพยาบาลที่กำลังรักษา']?.toString()?.trim() || undefined,
						labResult1: rowData['ผลแลป 1']?.toString()?.trim() || undefined,
						labResult2: rowData['ผลแลป 2']?.toString()?.trim() || undefined
					},
					include: {
						disease: { select: { nameTh: true } },
						hospital: { select: { name: true } },
						sickTambon: { select: { nameTh: true } },
						sickAmphoe: { select: { nameTh: true } },
						sickProvince: { select: { nameTh: true } }
					}
				});

				successCount++;

				// Send notification for each imported case (batch at the end instead)
				// We'll send a summary notification instead of individual ones
			} catch (error: any) {
				errors.push(`แถว ${i + 2}: ${error.message || 'เกิดข้อผิดพลาด'}`);
			}
		}

		// Log audit for import
		await logAudit(user.id, AuditActions.IMPORT, AuditResources.CASE_REPORT, `Imported ${successCount} cases, ${errors.length} errors`);

		// Send notification for import (summary)
		if (successCount > 0) {
			const { notifyCaseAction } = await import('$lib/server/notifications');
			notifyCaseAction({
				disease: `นำเข้า ${successCount} รายการ`,
				hospital: 'ระบบ',
				patientType: null,
				condition: null,
				tambon: null,
				amphoe: null,
				province: null,
				action: 'IMPORT',
				userId: user.id
			}).catch(err => console.error('Notification error:', err));
		}

		return json({
			success: true,
			processed: processedCount,
			successCount: successCount,
			errors: errors.slice(0, 50) // Limit errors to first 50
		});
	} catch (error: any) {
		console.error('Import error:', error);
		return json({ error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' }, { status: 500 });
	}
};

