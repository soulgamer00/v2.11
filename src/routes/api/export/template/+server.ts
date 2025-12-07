import { json } from '@sveltejs/kit';
import { hasRole } from '$lib/server/auth';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user || !hasRole(user, ['SUPERADMIN', 'ADMIN'])) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Create template data according to specified format
	const templateData = [
		{
			'เลขบัตรประจำตัวประชาชน': '1234567890123',
			'คำนำหน้าชื่อ': 'นาย',
			'ชื่อ': 'ตัวอย่าง',
			'นามสกุล': 'ผู้ป่วย',
			'เพศ': 'ชาย',
			'อายุปี': '35',
			'วัน/เดือน/ปีเกิด': '01/01/2533',
			'สถานภาพสมรส': 'โสด',
			'สัญชาติ': 'ไทย',
			'อาชีพ': 'เกษตรกร',
			'เบอร์โทรศัพท์': '0812345678',
			'บ้านเลขที่': '123',
			'หมู่ที่': '1',
			'ถนน': 'ถนนตัวอย่าง',
			'จังหวัด': 'จังหวัดตัวอย่าง',
			'อำเภอ/เขต': 'อำเภอตัวอย่าง',
			'ตำบล/แขวง': 'ตำบลตัวอย่าง',
			'บ้านเลขที่ (ขณะป่วย)': '456',
			'หมู่ที่ (ขณะป่วย)': '2',
			'ถนน (ขณะป่วย)': 'ถนนป่วย',
			'จังหวัด (ขณะป่วย)': 'จังหวัดป่วย',
			'อำเภอ/เขต (ขณะป่วย)': 'อำเภอป่วย',
			'ตำบล/แขวง (ขณะป่วย)': 'ตำบลป่วย',
			'ชื่อโรค': 'ไข้เลือดออก',
			'เขตพื้นที่รักษาตัว': 'โรงพยาบาลตัวอย่าง',
			'โรงพยาบาลที่กำลังรักษา': 'โรงพยาบาลตัวอย่าง',
			'วันที่เริ่มมีอาการ': '01/01/2567',
			'วันที่เริ่มรักษา': '02/01/2567',
			'วันที่วินิจฉัยโรค': '02/01/2567',
			'Diagnosis ICD-10': 'A90',
			'ประเภทผู้ป่วย': 'OPD',
			'สภาพผู้ป่วย': 'รักษาอยู่',
			'วันที่เสียชีวิต': '',
			'สาเหตุการเสียชีวิต': '',
			'ผลแลป 1': '',
			'ผลแลป 2': '',
			'หมายเหตุ': '',
			'จังหวัดที่รับรักษา': 'จังหวัดป่วย',
			'ชื่อผู้รายงาน': 'ผู้รายงานตัวอย่าง'
		}
	];

	// Create workbook
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.json_to_sheet(templateData);

	// Set column widths (according to new format)
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
		{ wch: 12 }, // บ้านเลขที่ (ป่วย)
		{ wch: 8 },  // หมู่ที่ (ป่วย)
		{ wch: 20 }, // ถนน (ป่วย)
		{ wch: 15 }, // จังหวัด (ป่วย)
		{ wch: 15 }, // อำเภอ/เขต (ป่วย)
		{ wch: 15 }, // ตำบล/แขวง (ป่วย)
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

	XLSX.utils.book_append_sheet(wb, ws, 'Template');

	// Generate buffer
	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	// Use ASCII-only filename
	const filename = 'template_import_cases.xlsx';

	// Create headers object
	const headers = new Headers();
	headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	headers.set('Content-Disposition', `attachment; filename="${filename}"`);

	// Return as download
	return new Response(buffer, { headers });
};

