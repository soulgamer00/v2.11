import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Build where clause
	const where: any = { deletedAt: null };

	if (user.role === 'USER' && user.hospitalId) {
		// Get patient IDs from cases in user's hospital
		const cases = await prisma.caseReport.findMany({
			where: {
				hospitalId: user.hospitalId,
				deletedAt: null
			},
			select: { patientId: true },
			distinct: ['patientId']
		});

		where.id = { in: cases.map((c) => c.patientId) };
	}

	// Get patients with related data
	const patients = await prisma.patient.findMany({
		where,
		include: {
			province: {
				select: { nameTh: true }
			},
			amphoe: {
				select: { nameTh: true }
			},
			tambon: {
				select: { nameTh: true }
			},
			_count: {
				select: { cases: true }
			}
		},
		orderBy: { updatedAt: 'desc' }
	});

	// Prepare data for Excel
	const excelData = patients.map((p) => ({
		'เลขบัตรประชาชน': p.idCard || '',
		'คำนำหน้า': p.prefix || '',
		'ชื่อ': p.firstName,
		'นามสกุล': p.lastName,
		'เพศ': p.gender === 'MALE' ? 'ชาย' : 'หญิง',
		'วันเกิด': p.birthDate ? new Date(p.birthDate).toLocaleDateString('th-TH') : '',
		'สัญชาติ': p.nationality || '',
		'สถานภาพ': p.maritalStatus || '',
		'อาชีพ': p.occupation || '',
		'เบอร์โทรศัพท์': p.phone || '',
		'บ้านเลขที่': p.addressNo || '',
		'หมู่ที่': p.moo || '',
		'ถนน': p.road || '',
		'ตำบล': p.tambon?.nameTh || '',
		'อำเภอ': p.amphoe?.nameTh || '',
		'จังหวัด': p.province?.nameTh || '',
		'รหัสไปรษณีย์': p.postalCode || '',
		'จำนวนรายงาน': p._count.cases,
		'วันที่สร้าง': p.createdAt ? new Date(p.createdAt).toLocaleDateString('th-TH') : '',
		'วันที่อัพเดท': p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('th-TH') : ''
	}));

	// Create workbook
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.json_to_sheet(excelData);

	// Set column widths
	const colWidths = [
		{ wch: 15 }, // เลขบัตรประชาชน
		{ wch: 8 },  // คำนำหน้า
		{ wch: 15 }, // ชื่อ
		{ wch: 20 }, // นามสกุล
		{ wch: 6 },  // เพศ
		{ wch: 12 }, // วันเกิด
		{ wch: 10 }, // สัญชาติ
		{ wch: 10 }, // สถานภาพ
		{ wch: 15 }, // อาชีพ
		{ wch: 12 }, // เบอร์โทรศัพท์
		{ wch: 12 }, // บ้านเลขที่
		{ wch: 8 },  // หมู่ที่
		{ wch: 20 }, // ถนน
		{ wch: 20 }, // ตำบล
		{ wch: 20 }, // อำเภอ
		{ wch: 15 }, // จังหวัด
		{ wch: 10 }, // รหัสไปรษณีย์
		{ wch: 10 }, // จำนวนรายงาน
		{ wch: 12 }, // วันที่สร้าง
		{ wch: 12 }  // วันที่อัพเดท
	];
	ws['!cols'] = colWidths;

	XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนผู้ป่วย');

	// Generate buffer
	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	// Use ASCII-only filename to avoid header encoding issues
	const dateStr = new Date().toISOString().split('T')[0];
	const filename = `patients_${dateStr}.xlsx`;

	// Create headers object
	const headers = new Headers();
	headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);

	// Return as download
	return new Response(buffer, { headers });
};

