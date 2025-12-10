<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				closeModal();
				// Invalidate all to refresh user data including permissions
				goto('/dashboard/users', { invalidateAll: true });
			} else if (result.type === 'failure') {
				// Handle form validation errors or server errors
				const errorMessage = result.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
				console.error('Form submission failed:', result);
				alert(errorMessage);
			}
		},
		onError: ({ result, error }) => {
			// Handle unexpected errors
			console.error('Form error:', result, error);
			const errorMessage = error?.message || result?.error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
			alert(errorMessage);
		}
	});

	let showModal = $state(false);
	let editMode = $state(false);
	let searchQuery = $state(data.search || '');
	let selectedUser: any = null;

	// Filter users based on search
	let filteredUsers = $derived(
		selectedUser
			? data.users.filter(u => u.id === selectedUser.id)
			: searchQuery
				? data.users.filter((u) =>
						u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
						u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
						u.hospital?.name.toLowerCase().includes(searchQuery.toLowerCase())
				  )
				: data.users
	);

	function handleUserSelect(user: any) {
		selectedUser = user;
		searchQuery = user.username;
	}

	function clearSearch() {
		searchQuery = '';
		selectedUser = null;
	}

	function openAddModal() {
		editMode = false;
		$form = {
			username: '',
			password: '',
			fullName: '',
			role: 'USER',
			hospitalId: undefined,
			isActive: true,
			permissions: []
		};
		showModal = true;
	}

	function openEditModal(user: any) {
		editMode = true;
		
		// Debug: Log user data to see what we're getting
		console.log('Opening edit modal for user:', user);
		
		$form = {
			id: user.id,
			username: user.username,
			password: '', // Don't fill password
			fullName: user.fullName,
			role: user.role,
			// Handle hospitalId - can be number, string, or null/undefined
			hospitalId: user.hospitalId !== null && user.hospitalId !== undefined 
				? String(user.hospitalId) 
				: undefined,
			isActive: user.isActive !== undefined ? user.isActive : true,
			// Handle permissions - ensure it's always an array
			permissions: (() => {
				if (Array.isArray(user.permissions)) {
					return user.permissions;
				}
				if (user.permissions && typeof user.permissions === 'string') {
					return [user.permissions];
				}
				if (user.permissions) {
					return [user.permissions];
				}
				return [];
			})()
		};
		
		// Debug: Log form data to verify
		console.log('Form data set to:', $form);
		
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานนี้?')) return;

		try {
			const formData = new FormData();
			formData.append('id', id);

			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData,
				headers: {
					'accept': 'application/json'
				}
			});

			// Get response text first to see what we got
			const responseText = await response.text();
			console.log('Delete response:', response.status, responseText);

			// Check if response is ok
			if (response.ok) {
				// Try to parse as JSON
				try {
					const result = JSON.parse(responseText);
					if (result.success || result.type === 'success') {
						goto('/dashboard/users', { invalidateAll: true });
						return;
					} else {
						const errorMsg = result.message || result.error || 'เกิดข้อผิดพลาดในการลบ';
						console.error('Delete failed:', result);
						alert(errorMsg);
						return;
					}
				} catch (parseError) {
					// If not JSON, check if it's HTML (SvelteKit form action response)
					if (responseText.includes('success') || response.status === 200) {
						// Assume success if status is 200
						goto('/dashboard/users', { invalidateAll: true });
						return;
					}
					console.error('Failed to parse response:', parseError, responseText);
					alert('ลบสำเร็จ (ไม่สามารถ parse response ได้)');
				}
			} else {
				// Response is not ok, try to get error message
				let errorMessage = `เกิดข้อผิดพลาดในการลบ (Status: ${response.status})`;
				
				try {
					const result = JSON.parse(responseText);
					errorMessage = result.message || result.error || result.data?.message || errorMessage;
					console.error('Delete error response:', result);
				} catch (parseError) {
					// Try to extract error from HTML if it's SvelteKit form action response
					const errorMatch = responseText.match(/message["\s]*:["\s]*([^"<]+)/i);
					if (errorMatch) {
						errorMessage = errorMatch[1];
					}
					console.error('Failed to parse error response:', parseError, responseText);
				}
				
				alert(errorMessage);
			}
		} catch (error) {
			console.error('Delete error:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			alert(`เกิดข้อผิดพลาดในการลบ: ${errorMessage}\n\nกรุณาตรวจสอบ Console (F12) เพื่อดูรายละเอียด`);
		}
	}

</script>

<svelte:head>
	<title>จัดการผู้ใช้งาน - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
		<div>
			<h1 class="text-xl sm:text-2xl md:text-3xl font-bold">จัดการผู้ใช้งาน</h1>
			<p class="text-base-content/60 mt-1">จัดการบัญชีผู้ใช้งานและสิทธิ์การเข้าถึง</p>
		</div>
		<button class="btn btn-primary" onclick={openAddModal}>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
			เพิ่มผู้ใช้งาน
		</button>
	</div>

	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<AutocompleteSearch
				bind:value={searchQuery}
				placeholder="ค้นหา: ชื่อผู้ใช้, ชื่อ-นามสกุล..."
				clientData={data.users}
				clientSearchFn={(user, query) => {
					if (!user || !query) return false;
					const q = query.toLowerCase();
					const username = user.username || '';
					const fullName = user.fullName || '';
					const hospitalName = user.hospital?.name || '';
					return (
						username.toLowerCase().includes(q) ||
						fullName.toLowerCase().includes(q) ||
						hospitalName.toLowerCase().includes(q)
					);
				}}
				onSelect={handleUserSelect}
				displayFn={(user) => user.fullName || user.username || ''}
				detailFn={(user) => {
					const details = [];
					details.push(`ชื่อผู้ใช้: ${user.username}`);
					if (user.hospital?.name) details.push(`หน่วยงาน: ${user.hospital.name}`);
					details.push(`บทบาท: ${user.role}`);
					return details.join(' | ');
				}}
				size="sm"
			/>
			{#if searchQuery || selectedUser}
				<button class="btn btn-ghost btn-sm mt-2" onclick={clearSearch}>
					ล้างการค้นหา
				</button>
			{/if}
		</div>
	</div>

	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>ชื่อผู้ใช้</th>
							<th>ชื่อ-นามสกุล</th>
							<th>บทบาท</th>
							<th>หน่วยงาน</th>
							<th>สถานะ</th>
							<th>จัดการ</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredUsers.length === 0}
							<tr><td colspan="6" class="text-center py-8 text-base-content/60">ไม่พบข้อมูล</td></tr>
						{:else}
							{#each filteredUsers as user}
								<tr>
									<td class="font-mono font-bold">{user.username}</td>
									<td>{user.fullName}</td>
									<td>
										<span class="badge badge-sm" class:badge-primary={user.role === 'SUPERADMIN'} class:badge-secondary={user.role === 'ADMIN'}>
											{user.role}
										</span>
									</td>
									<td>{user.hospital?.name || '-'}</td>
									<td>
										{#if user.isActive}
											<span class="badge badge-success badge-xs gap-1">ใช้งาน</span>
										{:else}
											<span class="badge badge-error badge-xs gap-1">ระงับ</span>
										{/if}
									</td>
									<td>
										<div class="flex gap-2">
											<button class="btn btn-sm btn-ghost" onclick={() => openEditModal(user)}>แก้ไข</button>
											{#if data.user?.role === 'SUPERADMIN' && user.id !== data.user?.id}
												<button class="btn btn-sm btn-ghost text-error" onclick={() => handleDelete(user.id)}>ลบ</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">{editMode ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h3>
			
			<form method="POST" action="?/{editMode ? 'update' : 'create'}" use:enhance>
				{#if editMode}
					<input type="hidden" name="id" value={$form.id} />
				{/if}

				<div class="form-control w-full">
					<label class="label"><span class="label-text">ชื่อผู้ใช้</span></label>
					<input type="text" name="username" bind:value={$form.username} class="input input-bordered w-full" required={!editMode} disabled={editMode} />
					{#if editMode}
						<input type="hidden" name="username" value={$form.username} />
					{/if}
					{#if $errors.username}<span class="text-error text-sm mt-1">{$errors.username}</span>{/if}
				</div>

				<div class="form-control w-full mt-2">
					<label class="label"><span class="label-text">รหัสผ่าน {editMode ? '(เว้นว่างถ้าไม่เปลี่ยน)' : ''}</span></label>
					<input type="password" name="password" bind:value={$form.password} class="input input-bordered w-full" required={!editMode} />
					{#if $errors.password}<span class="text-error text-sm mt-1">{$errors.password}</span>{/if}
				</div>

				<div class="form-control w-full mt-2">
					<label class="label"><span class="label-text">ชื่อ-นามสกุล</span></label>
					<input type="text" name="fullName" bind:value={$form.fullName} class="input input-bordered w-full" required />
					{#if $errors.fullName}<span class="text-error text-sm mt-1">{$errors.fullName}</span>{/if}
				</div>

				<div class="form-control w-full mt-2">
					<label class="label"><span class="label-text">บทบาท</span></label>
					<select name="role" bind:value={$form.role} class="select select-bordered w-full">
						{#if data.user?.role === 'SUPERADMIN'}
							<option value="SUPERADMIN">SUPERADMIN</option>
							<option value="ADMIN">ADMIN</option>
						{/if}
						<option value="USER">USER</option>
					</select>
				</div>

				<div class="form-control w-full mt-2">
					<label class="label"><span class="label-text">หน่วยงาน {#if $form.role === 'USER'}(จำเป็น){/if}</span></label>
					<select 
						name="hospitalId" 
						bind:value={$form.hospitalId} 
						class="select select-bordered w-full" 
						required={$form.role === 'USER'}
					>
						<option value="">เลือกหน่วยงาน</option>
						{#each data.hospitals as h}
							<option value={String(h.id)} selected={$form.hospitalId === String(h.id)}>
								{h.name}
							</option>
						{/each}
					</select>
					{#if $form.role === 'USER' && !$form.hospitalId}
						<span class="text-error text-sm mt-1">กรุณาเลือกหน่วยงาน</span>
					{/if}
					<!-- Debug info -->
					{#if editMode}
						<span class="text-xs text-base-content/50 mt-1">
							Debug: hospitalId = {JSON.stringify($form.hospitalId)}
						</span>
					{/if}
				</div>

				<div class="form-control w-full mt-2">
					<label class="cursor-pointer label justify-start gap-4">
						<span class="label-text">สถานะใช้งาน</span>
						<input type="checkbox" name="isActive" bind:checked={$form.isActive} class="toggle toggle-primary" value="on" />
					</label>
				</div>

				<!-- Permissions Section -->
				<div class="form-control w-full mt-4">
					<label class="label">
						<span class="label-text">สิทธิ์การเข้าถึง (Feature Flags)</span>
					</label>
					<div class="border border-base-300 rounded-lg p-4 space-y-2">
						{#if data.user?.role !== 'SUPERADMIN'}
							<div class="alert alert-info mb-2">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span class="text-xs">(เฉพาะ SUPERADMIN เท่านั้นที่สามารถจัดการสิทธิ์ได้)</span>
							</div>
						{/if}
						{#each [
							{ value: 'CAN_CREATE_CASES', label: 'สร้างรายงานเคส' },
							{ value: 'CAN_EDIT_CASES', label: 'แก้ไขรายงานเคส' },
							{ value: 'CAN_DELETE_CASES', label: 'ลบรายงานเคส' },
							{ value: 'CAN_EXPORT_EXCEL', label: 'ส่งออก Excel' },
							{ value: 'CAN_IMPORT_EXCEL', label: 'นำเข้า Excel' },
							{ value: 'CAN_VIEW_REPORTS', label: 'ดูรายงาน/สถิติ' },
							{ value: 'CAN_MANAGE_PATIENTS', label: 'จัดการผู้ป่วย' }
						] as perm}
							<label class="cursor-pointer label justify-start gap-3">
								<input 
									type="checkbox" 
									name="permissions" 
									value={perm.value}
									class="checkbox checkbox-primary checkbox-sm"
									disabled={data.user?.role !== 'SUPERADMIN'}
									checked={Array.isArray($form.permissions) && $form.permissions.includes(perm.value)}
									onchange={(e) => {
										if (data.user?.role === 'SUPERADMIN') {
											if (!$form.permissions) $form.permissions = [];
											if (e.currentTarget.checked) {
												if (!$form.permissions.includes(perm.value)) {
													$form.permissions = [...$form.permissions, perm.value];
												}
											} else {
												$form.permissions = $form.permissions.filter(p => p !== perm.value);
											}
										}
									}}
								/>
								<span class="label-text text-sm" class:opacity-50={data.user?.role !== 'SUPERADMIN'}>
									{perm.label}
								</span>
							</label>
						{/each}
						<!-- Hidden input to send permissions array - always include even if empty -->
						{#each ($form.permissions || []) as perm}
							<input type="hidden" name="permissions" value={perm} />
						{/each}
					</div>
				</div>

				<div class="modal-action">
					<button type="button" class="btn" onclick={closeModal}>ยกเลิก</button>
					<button type="submit" class="btn btn-primary" disabled={$delayed}>
						{#if $delayed}<span class="loading loading-spinner"></span>{/if}
						บันทึก
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop"></div>
	</div>
{/if}



