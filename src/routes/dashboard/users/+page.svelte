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
				goto('/dashboard/users', { invalidateAll: true });
			}
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
			isActive: true
		};
		showModal = true;
	}

	function openEditModal(user: any) {
		editMode = true;
		$form = {
			id: user.id,
			username: user.username,
			password: '', // Don't fill password
			fullName: user.fullName,
			role: user.role,
			hospitalId: user.hospitalId ? String(user.hospitalId) : undefined,
			isActive: user.isActive
		};
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editMode = false;
	}

	async function handleDelete(id: string) {
		if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานนี้?')) return;

		const formData = new FormData();
		formData.append('id', id);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			goto('/dashboard/users', { invalidateAll: true });
		} else {
			alert('เกิดข้อผิดพลาดในการลบ');
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
							<option value={h.id}>{h.name}</option>
						{/each}
					</select>
					{#if $form.role === 'USER' && !$form.hospitalId}
						<span class="text-error text-sm mt-1">กรุณาเลือกหน่วยงาน</span>
					{/if}
				</div>

				<div class="form-control w-full mt-2">
					<label class="cursor-pointer label justify-start gap-4">
						<span class="label-text">สถานะใช้งาน</span>
						<input type="checkbox" name="isActive" bind:checked={$form.isActive} class="toggle toggle-primary" value="on" />
					</label>
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



