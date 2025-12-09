import { z } from 'zod';

export const userSchema = z.object({
	id: z.string().optional(),
	username: z.string().min(4, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร'),
	password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional().or(z.literal('')),
	fullName: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
	role: z.enum(['SUPERADMIN', 'ADMIN', 'USER']),
	hospitalId: z.string().optional().transform((val) => {
		if (val === '' || val === null || val === undefined) return undefined;
		const num = parseInt(val);
		return isNaN(num) ? undefined : num;
	}),
	isActive: z.string().optional().transform((val) => {
		if (val === 'on' || val === 'true' || val === '1') return true;
		if (val === 'off' || val === 'false' || val === '0' || val === '' || val === null || val === undefined) return false;
		return Boolean(val);
	}).default('true'),
	permissions: z.array(z.string()).optional().default([])
}).refine((data) => {
	// If role is USER, hospitalId is required
	// For ADMIN and SUPERADMIN, hospitalId is optional
	if (data.role === 'USER' && !data.hospitalId) {
		return false;
	}
	return true;
}, {
	message: 'ผู้ใช้งานทั่วไปต้องระบุหน่วยงาน',
	path: ['hospitalId']
});

export type UserSchema = z.infer<typeof userSchema>;



