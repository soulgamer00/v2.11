import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { checkRateLimit, RateLimitConfigs } from '$lib/server/rateLimit';
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
					nationality: true,
					addressNo: true,
					moo: true,
					road: true,
					provinceId: true,
					amphoeId: true,
					tambonId: true
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

	// Get patient addresses for current address
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

	// Prepare CSV column headers according to specified format
	const csvHeaders = [
		'เลขบัตรประจำตัวประชาชน',
		'คำนำหน้าชื่อ',
		'ชื่อ',
		'นามสกุล',
		'เพศ',
		'อายุปี',
		'วัน/เดือน/ปีเกิด',
		'สถานภาพสมรส',
		'สัญชาติ',
		'อาชีพ',
		'เบอร์โทรศัพท์',
		'บ้านเลขที่',
		'หมู่ที่',
		'ถนน',
		'จังหวัด',
		'อำเภอ/เขต',
		'ตำบล/แขวง',
		'บ้านเลขที่ (ขณะป่วย)',
		'หมู่ที่ (ขณะป่วย)',
		'ถนน (ขณะป่วย)',
		'จังหวัด (ขณะป่วย)',
		'อำเภอ/เขต (ขณะป่วย)',
		'ตำบล/แขวง (ขณะป่วย)',
		'ชื่อโรค',
		'เขตพื้นที่รักษาตัว',
		'โรงพยาบาลที่กำลังรักษา',
		'วันที่เริ่มมีอาการ',
		'วันที่เริ่มรักษา',
		'วันที่วินิจฉัยโรค',
		'Diagnosis ICD-10',
		'ประเภทผู้ป่วย',
		'สภาพผู้ป่วย',
		'วันที่เสียชีวิต',
		'สาเหตุการเสียชีวิต',
		'จังหวัดที่รับรักษา',
		'ชื่อผู้รายงาน'
	];

	// Escape CSV values
	function escapeCSV(value: any): string {
		if (value === null || value === undefined) return '';
		const str = String(value);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	}

	// Build CSV content according to new format
	const csvRows = [
		csvHeaders.join(','),
		...cases.map((c) => {
			const patientAddr = patientAddressMap.get(c.patientId) || {
				addressNo: '',
				moo: '',
				road: '',
				province: '',
				amphoe: '',
				tambon: ''
			};

			return [
				escapeCSV(c.patient.idCard || ''),
				escapeCSV(c.patient.prefix || ''),
				escapeCSV(c.patient.firstName),
				escapeCSV(c.patient.lastName),
				escapeCSV(c.patient.gender === 'MALE' ? 'ชาย' : 'หญิง'),
				escapeCSV(c.ageYears),
				escapeCSV(
					c.patient.birthDate
						? new Date(c.patient.birthDate).toLocaleDateString('th-TH', {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit'
						  })
						: ''
				),
				escapeCSV(c.patient.maritalStatus || ''),
				escapeCSV(c.patient.nationality || 'ไทย'),
				escapeCSV(c.patient.occupation || ''),
				escapeCSV(c.patient.phone || ''),
				// ที่อยู่ปัจจุบัน
				escapeCSV(patientAddr.addressNo),
				escapeCSV(patientAddr.moo),
				escapeCSV(patientAddr.road),
				escapeCSV(patientAddr.province),
				escapeCSV(patientAddr.amphoe),
				escapeCSV(patientAddr.tambon),
				// ที่อยู่ขณะป่วย
				escapeCSV(c.sickAddressNo || ''),
				escapeCSV(c.sickMoo || ''),
				escapeCSV(c.sickRoad || ''),
				escapeCSV(c.sickProvince?.nameTh || ''),
				escapeCSV(c.sickAmphoe?.nameTh || ''),
				escapeCSV(c.sickTambon?.nameTh || ''),
				escapeCSV(c.disease.nameTh),
				escapeCSV(''), // เขตพื้นที่รักษาตัว - not in schema
				escapeCSV(c.hospital.name),
				escapeCSV(
					c.illnessDate
						? new Date(c.illnessDate).toLocaleDateString('th-TH', {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit'
						  })
						: ''
				),
				escapeCSV(
					c.treatDate
						? new Date(c.treatDate).toLocaleDateString('th-TH', {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit'
						  })
						: ''
				),
				escapeCSV(
					c.diagnosisDate
						? new Date(c.diagnosisDate).toLocaleDateString('th-TH', {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit'
						  })
						: ''
				),
				escapeCSV(c.disease.code),
				escapeCSV(c.patientType === 'IPD' ? 'ผู้ป่วยใน' : c.patientType === 'OPD' ? 'ผู้ป่วยนอก' : c.patientType === 'ACF' ? 'ACF' : ''),
				escapeCSV(c.condition === 'RECOVERED' ? 'หายแล้ว' : c.condition === 'DIED' ? 'เสียชีวิต' : c.condition === 'UNDER_TREATMENT' ? 'อยู่ระหว่างการรักษา' : ''),
				escapeCSV(
					c.deathDate
						? new Date(c.deathDate).toLocaleDateString('th-TH', {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit'
						  })
						: ''
				),
				escapeCSV(c.causeOfDeath || ''),
				escapeCSV(c.sickProvince?.nameTh || ''),
				escapeCSV(c.reporterName || '')
			].join(',');
		})
	];

	const csvContent = csvRows.join('\n');
	const csvBuffer = Buffer.from('\ufeff' + csvContent, 'utf-8'); // BOM for Excel UTF-8

	// Use ASCII-only filename to avoid header encoding issues
	const dateStr = new Date().toISOString().split('T')[0];
	const filename = `cases_${dateStr}.csv`;

	// Create headers object
	const headers = new Headers();
	headers.set('Content-Type', 'text/csv; charset=utf-8');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);

	return new Response(csvBuffer, { headers });
};

