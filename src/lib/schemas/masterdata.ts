import { z } from 'zod';

// Disease schema
export const diseaseSchema = z.object({
	id: z.number().optional(),
	code: z.string().min(1, 'กรุณากรอกรหัสโรค (ICD-10)'),
	nameTh: z.string().min(1, 'กรุณากรอกชื่อโรคภาษาไทย'),
	nameEn: z.string().optional(),
	abbreviation: z.string().optional(),
	symptoms: z.string().optional(),
	isActive: z.boolean().default(true)
});

// Hospital schema
export const hospitalSchema = z.object({
	id: z.number().optional(),
	name: z.string().min(1, 'กรุณากรอกชื่อหน่วยงาน'),
	code9New: z.string().min(1, 'กรุณากรอกรหัส 9 หลัก').max(9, 'รหัส 9 หลักต้องไม่เกิน 9 ตัวอักษร'),
	code9: z.string().min(9, 'กรุณากรอกรหัส 9 หลัก').max(9).optional().or(z.literal('')),
	code5: z.string().min(5, 'กรุณากรอกรหัส 5 หลัก').max(5).optional().or(z.literal('')),
	type: z.string().optional(),
	orgType: z.string().optional(),
	healthServiceType: z.string().optional(),
	affiliation: z.string().optional(),
	department: z.string().optional()
});

// Population schema
export const populationSchema = z.object({
	year: z.number().min(2000).max(2100),
	hospitalId: z.number(),
	amount: z.number().min(0, 'จำนวนประชากรต้องมากกว่า 0')
});

// Occupation schema (MasterData with category='OCCUPATION')
export const occupationSchema = z.object({
	id: z.number().optional(),
	value: z.string().min(1, 'กรุณากรอกชื่ออาชีพ')
});

export type DiseaseSchema = z.infer<typeof diseaseSchema>;
export type HospitalSchema = z.infer<typeof hospitalSchema>;
export type PopulationSchema = z.infer<typeof populationSchema>;
export type OccupationSchema = z.infer<typeof occupationSchema>;

