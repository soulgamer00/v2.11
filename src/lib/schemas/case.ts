import { z } from 'zod';

// Patient schema
export const patientSchema = z.object({
	id: z.string().optional(),
	idCard: z.string().min(13, 'เลขบัตรประชาชนต้องมี 13 หลัก').max(13).optional().or(z.literal('')),
	prefix: z.string().min(1, 'กรุณาเลือกคำนำหน้า'),
	firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
	lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
	gender: z.enum(['MALE', 'FEMALE'], { required_error: 'กรุณาเลือกเพศ' }),
	birthDate: z.string().optional().or(z.literal('')),
	nationality: z.string().default('ไทย'),
	maritalStatus: z.string().optional(),
	occupation: z.string().optional(),
	phone: z.string().optional(),
	addressNo: z.string().optional(),
	moo: z.string().optional(),
	road: z.string().optional(),
	postalCode: z.string().max(5, 'รหัสไปรษณีย์ต้องไม่เกิน 5 หลัก').optional(),
	provinceId: z.number().int().optional(),
	amphoeId: z.number().int().optional(),
	tambonId: z.number().int().optional()
});

// Case report schema
export const caseReportSchema = z.object({
	// Patient info (embedded)
	patient: patientSchema,

	// Hospital
	hospitalId: z.number({ required_error: 'กรุณาเลือกหน่วยงาน' }),

	// Disease
	diseaseId: z.number({ required_error: 'กรุณาเลือกโรค' }),

	// Dates
	illnessDate: z.string().min(1, 'กรุณาระบุวันที่เริ่มป่วย'),
	treatDate: z.string().optional(),
	diagnosisDate: z.string().optional(),

	// Status
	patientType: z.enum(['IPD', 'OPD', 'ACF']).optional(),
	condition: z.enum(['RECOVERED', 'DIED', 'UNDER_TREATMENT']).optional(),
	deathDate: z.string().optional().or(z.literal('')),
	causeOfDeath: z.string().optional().or(z.literal('')),

	// Sick Address
	useSameAddress: z.boolean().default(false),
	sickAddressNo: z.string().optional(),
	sickMoo: z.string().optional(),
	sickRoad: z.string().optional(),
	sickPostalCode: z.string().max(5, 'รหัสไปรษณีย์ต้องไม่เกิน 5 หลัก').optional(),
	// Change back to optional but validate in refine
	sickProvinceId: z.number().int().optional(),
	sickAmphoeId: z.number().int().optional(),
	sickTambonId: z.number().int().optional(),

	// Metadata
	reporterName: z.string().optional(),
	remark: z.string().optional().or(z.literal('')),
	treatingHospital: z.string().optional().or(z.literal('')), // โรงพยาบาลที่กำลังรักษา (Free text)
	
	// Lab Results (Free text fields)
	labResult1: z.string().optional().or(z.literal('')),
	labResult2: z.string().optional().or(z.literal(''))
}).superRefine((data, ctx) => {
	// Validate sick address if not using same address
	if (!data.useSameAddress) {
		if (!data.sickProvinceId || data.sickProvinceId < 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาเลือกจังหวัด (ขณะป่วย)",
				path: ["sickProvinceId"]
			});
		}
		if (!data.sickAmphoeId || data.sickAmphoeId < 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาเลือกอำเภอ (ขณะป่วย)",
				path: ["sickAmphoeId"]
			});
		}
		if (!data.sickTambonId || data.sickTambonId < 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาเลือกตำบล (ขณะป่วย)",
				path: ["sickTambonId"]
			});
		}
	}

	// Validate death information if condition is DIED
	if (data.condition === 'DIED') {
		if (!data.deathDate || data.deathDate.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาระบุวันที่เสียชีวิต",
				path: ["deathDate"]
			});
		}
		if (!data.causeOfDeath || data.causeOfDeath.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาระบุสาเหตุการเสียชีวิต",
				path: ["causeOfDeath"]
			});
		}
		if (!data.remark || data.remark.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "กรุณาระบุหมายเหตุเพิ่มเติม",
				path: ["remark"]
			});
		}
	}
});

export type PatientSchema = z.infer<typeof patientSchema>;
export type CaseReportSchema = z.infer<typeof caseReportSchema>;
