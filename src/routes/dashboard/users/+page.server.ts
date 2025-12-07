import { fail, redirect, error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { userSchema } from '$lib/schemas/user';
import { prisma } from '$lib/server/db';
import { hasRole } from '$lib/server/auth';
import { logAudit, AuditActions, AuditResources } from '$lib/server/audit';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/login');
	if (locals.user.role !== 'SUPERADMIN' && locals.user.role !== 'ADMIN') {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}
	const currentUser = locals.user;

	const search = url.searchParams.get('search') || '';

	// Build where clause
	const where: any = {};
	if (search) {
		where.OR = [
			{ username: { contains: search, mode: 'insensitive' } },
			{ fullName: { contains: search, mode: 'insensitive' } }
		];
	}

	// Role-based filtering
	if (currentUser.role === 'ADMIN') {
		// Admin can only see users in their hospital (if they have one) or created by them?
		// Requirement says: "ADMIN ... Manage Hospital Users"
		// So maybe filter by creator or just show USER roles?
		// Let's assume ADMIN can manage USERs and maybe other ADMINs in same hospital context if applicable.
		// For simplicity and v2.0 spec: "Manage Hospital Users" usually implies filtering by hospital.
		// But User model has hospitalId.
		
		// If ADMIN is not linked to hospital, maybe they are global admin? 
		// Spec says: "ADMIN (Public Health): Global Write Access... Manage Hospital Users"
		// This implies ADMIN creates users for hospitals.
		
		// Let's filter to show only USER role if logged in as ADMIN, or maybe all if GLOBAL ADMIN.
		// Safer: ADMIN can only manage USERs. SUPERADMIN can manage ALL.
		where.role = 'USER';
	}

	const [users, hospitals] = await Promise.all([
		prisma.user.findMany({
			where,
			include: {
				hospital: true
			},
			orderBy: { createdAt: 'desc' }
		}),
		prisma.hospital.findMany({
			where: {
				deletedAt: null // Only show non-deleted hospitals
			},
			orderBy: { name: 'asc' }
		})
	]);

	const form = await superValidate(zod(userSchema));

	return {
		users,
		hospitals,
		form,
		search,
		user: currentUser // Return current user for frontend checks
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !hasRole(currentUser, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(userSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Validate Role Permissions
		if (currentUser.role === 'ADMIN' && form.data.role !== 'USER') {
			return fail(403, { form, message: 'ADMIN สามารถสร้างได้เฉพาะผู้ใช้งานทั่วไป (USER) เท่านั้น' });
		}

		// Validate Hospital for USER
		if (form.data.role === 'USER' && !form.data.hospitalId) {
			return fail(400, { form, message: 'ผู้ใช้งานทั่วไปต้องระบุหน่วยงาน' });
		}

		// Check username uniqueness
		const existingUser = await prisma.user.findUnique({
			where: { username: form.data.username }
		});
		if (existingUser) {
			return fail(400, { form, message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });
		}

		if (!form.data.password) {
			return fail(400, { form, message: 'กรุณาระบุรหัสผ่าน' });
		}

		try {
			const passwordHash = await bcrypt.hash(form.data.password, 10);

			const newUser = await prisma.user.create({
				data: {
					username: form.data.username,
					passwordHash,
					fullName: form.data.fullName,
					role: form.data.role,
					hospitalId: form.data.hospitalId ? Number(form.data.hospitalId) : null,
					isActive: Boolean(form.data.isActive),
					creatorId: currentUser.id
				}
			});

			await logAudit(currentUser.id, AuditActions.CREATE, `${AuditResources.USER}:${newUser.username}`);
		} catch (error) {
			console.error(error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
		}

		return { form };
	},

	update: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !hasRole(currentUser, ['SUPERADMIN', 'ADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์เข้าถึง' });
		}

		const form = await superValidate(request, zod(userSchema));

		if (!form.valid || !form.data.id) {
			return fail(400, { form });
		}

		// Check permissions
		// ADMIN cannot edit SUPERADMIN
		const targetUser = await prisma.user.findUnique({ where: { id: form.data.id } });
		if (!targetUser) return fail(404, { form, message: 'ไม่พบผู้ใช้งาน' });

		if (currentUser.role === 'ADMIN') {
			if (targetUser.role === 'SUPERADMIN' || targetUser.role === 'ADMIN') {
				if (targetUser.id !== currentUser.id) { // Allow editing self? Maybe.
					return fail(403, { form, message: 'ไม่มีสิทธิ์แก้ไขผู้ใช้งานระดับสูงกว่าหรือเท่ากัน' });
				}
			}
			if (form.data.role !== 'USER') {
				return fail(403, { form, message: 'ADMIN สามารถจัดการได้เฉพาะผู้ใช้งานทั่วไป' });
			}
		}

		try {
			const updateData: any = {
				username: form.data.username,
				fullName: form.data.fullName,
				role: form.data.role,
				hospitalId: form.data.hospitalId ? Number(form.data.hospitalId) : null,
				isActive: Boolean(form.data.isActive)
			};

			// Update password only if provided
			if (form.data.password) {
				updateData.passwordHash = await bcrypt.hash(form.data.password, 10);
			}

			const updatedUser = await prisma.user.update({
				where: { id: form.data.id },
				data: updateData
			});

			await logAudit(currentUser.id, AuditActions.UPDATE, `${AuditResources.USER}:${updatedUser.username}`);
		} catch (error) {
			console.error(error);
			return fail(500, { form, message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
		}

		return { form };
	},

	delete: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (!currentUser || !hasRole(currentUser, ['SUPERADMIN'])) {
			return fail(403, { message: 'ไม่มีสิทธิ์ลบผู้ใช้งาน' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'Missing ID' });
		if (id === currentUser.id) return fail(400, { message: 'ไม่สามารถลบบัญชีตัวเองได้' });

		try {
			const deletedUser = await prisma.user.findUnique({ where: { id } });
			await prisma.user.delete({ where: { id } });

			if (deletedUser) {
				await logAudit(currentUser.id, AuditActions.DELETE, `${AuditResources.USER}:${deletedUser.username}`);
			}
		} catch (error) {
			return fail(500, { message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
		}

		return { success: true };
	}
};

