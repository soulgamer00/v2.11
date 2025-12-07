import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { checkRateLimit, RateLimitConfigs } from '$lib/server/rateLimit';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url, getClientAddress }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Apply rate limiting for export
	const rateLimitResult = checkRateLimit(
		{ getClientAddress, url },
		RateLimitConfigs.EXPORT
	);

	if (rateLimitResult) {
		return json(rateLimitResult.body, { status: rateLimitResult.status });
	}

	// Check permissions
	if (user.role === 'USER' && !user.hospitalId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	// Get filters from query params
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const diseaseId = url.searchParams.get('diseaseId');
	const hospitalId = url.searchParams.get('hospitalId');

	// Build where clause
	const where: any = { deletedAt: null };

	if (user.role === 'USER' && user.hospitalId) {
		where.hospitalId = user.hospitalId;
	}

	if (startDate) {
		where.illnessDate = { ...where.illnessDate, gte: new Date(startDate) };
	}

	if (endDate) {
		// Set end date to end of day (23:59:59)
		const endDateTime = new Date(endDate);
		endDateTime.setHours(23, 59, 59, 999);
		where.illnessDate = { ...where.illnessDate, lte: endDateTime };
	}
	
	// Validate date range if both are provided
	if (startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (start > end) {
			return json({ error: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' }, { status: 400 });
		}
		
		// Prevent exporting too much data (more than 1 year)
		const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		if (daysDiff > 365) {
			return json({ error: 'ช่วงวันที่ต้องไม่เกิน 365 วัน กรุณาเลือกช่วงวันที่ที่สั้นลง' }, { status: 400 });
		}
	}
	
	// If no date range provided, default to last 30 days
	if (!startDate && !endDate) {
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(endDate.getDate() - 30);
		where.illnessDate = {
			gte: startDate,
			lte: endDate
		};
	}

	if (diseaseId) {
		where.diseaseId = parseInt(diseaseId);
	}

	if (hospitalId && hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		where.hospitalId = parseInt(hospitalId);
	}

	// Get cases with related data
	const cases = await prisma.caseReport.findMany({
		where,
		include: {
			patient: {
				select: {
					idCard: true,
					prefix: true,
					firstName: true,
					lastName: true,
					gender: true,
					birthDate: true,
					occupation: true,
					phone: true,
					maritalStatus: true,
					nationality: true
				}
			},
			disease: {
				select: {
					code: true,
					nameTh: true,
					nameEn: true
				}
			},
			hospital: {
				select: {
					name: true,
					code9New: true
				}
			},
			sickProvince: {
				select: { nameTh: true }
			},
			sickAmphoe: {
				select: { nameTh: true }
			},
			sickTambon: {
				select: { nameTh: true }
			}
		},
		orderBy: { illnessDate: 'desc' }
	});

	// Get patient addresses for current address (if not already included)
	const patientIds = [...new Set(cases.map((c) => c.patientId))];
	const patientsWithAddress = await prisma.patient.findMany({
		where: {
			id: { in: patientIds }
		},
		include: {
			province: { select: { nameTh: true } },
			amphoe: { select: { nameTh: true } },
			tambon: { select: { nameTh: true } }
		}
	});

	const patientAddressMap = new Map(
		patientsWithAddress.map((p) => [
			p.id,
			{
				addressNo: p.addressNo || '',
				moo: p.moo || '',
				road: p.road || '',
				province: p.province?.nameTh || '',
				amphoe: p.amphoe?.nameTh || '',
				tambon: p.tambon?.nameTh || ''
			}
		])
	);

	// Prepare data for Excel according to specified format
	const excelData = cases.map((c) => {
		const patientAddr = patientAddressMap.get(c.patientId) || {
			addressNo: '',
			moo: '',
			road: '',
			province: '',
			amphoe: '',
			tambon: ''
		};

		return {
			'เลขบัตรประจำตัวประชาชน': c.patient.idCard || '',
			'คำนำหน้าชื่อ': c.patient.prefix || '',
			'ชื่อ': c.patient.firstName,
			'นามสกุล': c.patient.lastName,
			'เพศ': c.patient.gender === 'MALE' ? 'ชาย' : 'หญิง',
			'อายุปี': c.ageYears,
			'วัน/เดือน/ปีเกิด': c.patient.birthDate
				? new Date(c.patient.birthDate).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
				  })
				: '',
			'สถานภาพสมรส': c.patient.maritalStatus || '',
			'สัญชาติ': c.patient.nationality || 'ไทย',
			'อาชีพ': c.patient.occupation || '',
			'เบอร์โทรศัพท์': c.patient.phone || '',
			// ที่อยู่ปัจจุบัน
			'บ้านเลขที่': patientAddr.addressNo,
			'หมู่ที่': patientAddr.moo,
			'ถนน': patientAddr.road,
			'จังหวัด': patientAddr.province,
			'อำเภอ/เขต': patientAddr.amphoe,
			'ตำบล/แขวง': patientAddr.tambon,
			// ที่อยู่ขณะป่วย (ต้องใช้ชื่อที่แตกต่างจากที่อยู่ปัจจุบัน)
			'บ้านเลขที่ (ขณะป่วย)': c.sickAddressNo || '',
			'หมู่ที่ (ขณะป่วย)': c.sickMoo || '',
			'ถนน (ขณะป่วย)': c.sickRoad || '',
			'จังหวัด (ขณะป่วย)': c.sickProvince?.nameTh || '',
			'อำเภอ/เขต (ขณะป่วย)': c.sickAmphoe?.nameTh || '',
			'ตำบล/แขวง (ขณะป่วย)': c.sickTambon?.nameTh || '',
			'ชื่อโรค': c.disease.nameTh,
			'เขตพื้นที่รักษาตัว': c.hospital.name, // แสดงชื่อหน่วยงาน
			'โรงพยาบาลที่กำลังรักษา': c.treatingHospital || c.hospital.name, // ใช้ treatingHospital ถ้ามี
			'วันที่เริ่มมีอาการ': c.illnessDate
				? new Date(c.illnessDate).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
				  })
				: '',
			'วันที่เริ่มรักษา': c.treatDate
				? new Date(c.treatDate).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
				  })
				: '',
			'วันที่วินิจฉัยโรค': c.diagnosisDate
				? new Date(c.diagnosisDate).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
				  })
				: '',
			'Diagnosis ICD-10': c.disease.code,
			'ประเภทผู้ป่วย': c.patientType === 'IPD' ? 'ผู้ป่วยใน' : c.patientType === 'OPD' ? 'ผู้ป่วยนอก' : c.patientType === 'ACF' ? 'ACF' : '',
			'สภาพผู้ป่วย': c.condition === 'RECOVERED' ? 'หายแล้ว' : c.condition === 'DIED' ? 'เสียชีวิต' : c.condition === 'UNDER_TREATMENT' ? 'อยู่ระหว่างการรักษา' : '',
			'วันที่เสียชีวิต': c.deathDate
				? new Date(c.deathDate).toLocaleDateString('th-TH', {
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
				  })
				: '',
			'สาเหตุการเสียชีวิต': c.causeOfDeath || '',
			'ผลแลป 1': c.labResult1 || '',
			'ผลแลป 2': c.labResult2 || '',
			'หมายเหตุ': c.remark || '',
			'จังหวัดที่รับรักษา': c.sickProvince?.nameTh || '',
			'ชื่อผู้รายงาน': c.reporterName || ''
		};
	});

	// Create workbook
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.json_to_sheet(excelData);

	// Set column widths (according to new format - 39 columns total)
	const colWidths = [
		{ wch: 18 }, // เลขบัตรประจำตัวประชาชน
		{ wch: 10 }, // คำนำหน้าชื่อ
		{ wch: 15 }, // ชื่อ
		{ wch: 20 }, // นามสกุล
		{ wch: 6 },  // เพศ
		{ wch: 8 },  // อายุปี
		{ wch: 12 }, // วัน/เดือน/ปีเกิด
		{ wch: 12 }, // สถานภาพสมรส
		{ wch: 10 }, // สัญชาติ
		{ wch: 15 }, // อาชีพ
		{ wch: 12 }, // เบอร์โทรศัพท์
		{ wch: 12 }, // บ้านเลขที่ (ปัจจุบัน)
		{ wch: 8 },  // หมู่ที่ (ปัจจุบัน)
		{ wch: 20 }, // ถนน (ปัจจุบัน)
		{ wch: 15 }, // จังหวัด (ปัจจุบัน)
		{ wch: 15 }, // อำเภอ/เขต (ปัจจุบัน)
		{ wch: 15 }, // ตำบล/แขวง (ปัจจุบัน)
		{ wch: 12 }, // บ้านเลขที่ (ขณะป่วย)
		{ wch: 8 },  // หมู่ที่ (ขณะป่วย)
		{ wch: 20 }, // ถนน (ขณะป่วย)
		{ wch: 15 }, // จังหวัด (ขณะป่วย)
		{ wch: 15 }, // อำเภอ/เขต (ขณะป่วย)
		{ wch: 15 }, // ตำบล/แขวง (ขณะป่วย)
		{ wch: 25 }, // ชื่อโรค
		{ wch: 30 }, // เขตพื้นที่รักษาตัว (ชื่อหน่วยงาน)
		{ wch: 30 }, // โรงพยาบาลที่กำลังรักษา
		{ wch: 12 }, // วันที่เริ่มมีอาการ
		{ wch: 12 }, // วันที่เริ่มรักษา
		{ wch: 12 }, // วันที่วินิจฉัยโรค
		{ wch: 12 }, // Diagnosis ICD-10
		{ wch: 12 }, // ประเภทผู้ป่วย
		{ wch: 20 }, // สภาพผู้ป่วย
		{ wch: 12 }, // วันที่เสียชีวิต
		{ wch: 25 }, // สาเหตุการเสียชีวิต
		{ wch: 30 }, // ผลแลป 1
		{ wch: 30 }, // ผลแลป 2
		{ wch: 30 }, // หมายเหตุ
		{ wch: 15 }, // จังหวัดที่รับรักษา
		{ wch: 20 }  // ชื่อผู้รายงาน
	];
	ws['!cols'] = colWidths;

	XLSX.utils.book_append_sheet(wb, ws, 'รายงานเคส');

	// Generate buffer
	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	// Use ASCII-only filename to avoid header encoding issues
	const dateStr = new Date().toISOString().split('T')[0];
	const filename = `cases_${dateStr}.xlsx`;

	// Create headers object
	const headers = new Headers();
	headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);

	// Return as download
	return new Response(buffer, { headers });
};

