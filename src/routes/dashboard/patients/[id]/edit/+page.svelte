<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { patientSchema } from '$lib/schemas/case';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: zodClient(patientSchema),
		onResult: ({ result }) => {
			if (result.type === 'success' && result.data?.success) {
				goto('/dashboard/patients', { invalidateAll: true });
			}
		}
	});

	let amphoes = $state<any[]>([]);
	let tambons = $state<any[]>([]);

	// Load amphoes when province changes
	$effect(() => {
		if ($form.provinceId && $form.provinceId > 0) {
			fetch(`/api/geo/amphoes?provinceId=${$form.provinceId}`)
				.then((res) => res.json())
				.then((data) => {
					amphoes = data;
					// Reset amphoe and tambon if province changed
					if (data.patient?.provinceId !== $form.provinceId) {
						$form.amphoeId = 0;
						$form.tambonId = 0;
						tambons = [];
					}
				})
				.catch(console.error);
		} else {
			amphoes = [];
			$form.amphoeId = 0;
			$form.tambonId = 0;
			tambons = [];
		}
	});

	// Load tambons when amphoe changes
	$effect(() => {
		if ($form.amphoeId && $form.amphoeId > 0) {
			fetch(`/api/geo/tambons?amphoeId=${$form.amphoeId}`)
				.then((res) => res.json())
				.then((data) => {
					tambons = data;
					// Reset tambon if amphoe changed
					if (data.patient?.amphoeId !== $form.amphoeId) {
						$form.tambonId = 0;
					}
				})
				.catch(console.error);
		} else {
			tambons = [];
			$form.tambonId = 0;
		}
	});

	// Load initial amphoes and tambons
	if (browser && data.patient.provinceId) {
		fetch(`/api/geo/amphoes?provinceId=${data.patient.provinceId}`)
			.then((res) => res.json())
			.then((data) => {
				amphoes = data;
				if (data.patient?.amphoeId) {
					return fetch(`/api/geo/tambons?amphoeId=${data.patient.amphoeId}`);
				}
			})
			.then((res) => res?.json())
			.then((data) => {
				if (data) tambons = data;
			})
			.catch(console.error);
	}
</script>

<svelte:head>
	<title>แก้ไขข้อมูลผู้ป่วย - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold">แก้ไขข้อมูลผู้ป่วย</h1>
			<p class="text-base-content/60 mt-1">
				{data.patient.prefix || ''} {data.patient.firstName} {data.patient.lastName}
			</p>
		</div>
		<a href="/dashboard/patients" class="btn btn-ghost">ยกเลิก</a>
	</div>

	<!-- Form -->
	<form method="POST" action="?/update" use:enhance class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-primary border-b pb-2 mb-4">ข้อมูลส่วนตัว</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- ID Card -->
				<div class="form-control md:col-span-2">
					<label class="label" for="idCard">
						<span class="label-text">เลขบัตรประชาชน</span>
					</label>
					<input
						type="text"
						id="idCard"
						bind:value={$form.idCard}
						class="input input-bordered {errors.idCard ? 'input-error' : ''}"
						placeholder="กรอก 13 หลัก (ถ้ามี)"
						maxlength="13"
					/>
					{#if errors.idCard}
						<label class="label">
							<span class="label-text-alt text-error">{errors.idCard}</span>
						</label>
					{/if}
				</div>

				<!-- Prefix -->
				<div class="form-control">
					<label class="label" for="prefix">
						<span class="label-text">คำนำหน้า <span class="text-error">*</span></span>
					</label>
					<select
						id="prefix"
						bind:value={$form.prefix}
						class="select select-bordered {errors.prefix ? 'select-error' : ''}"
						required
					>
						<option value="">เลือกคำนำหน้า</option>
						{#each data.masterData.PREFIX || [] as prefix}
							<option value={prefix.value}>{prefix.value}</option>
						{/each}
					</select>
					{#if errors.prefix}
						<label class="label">
							<span class="label-text-alt text-error">{errors.prefix}</span>
						</label>
					{/if}
				</div>

				<!-- Gender -->
				<div class="form-control">
					<label class="label" for="gender">
						<span class="label-text">เพศ <span class="text-error">*</span></span>
					</label>
					<select
						id="gender"
						bind:value={$form.gender}
						class="select select-bordered {errors.gender ? 'select-error' : ''}"
						required
					>
						<option value="">เลือกเพศ</option>
						<option value="MALE">ชาย</option>
						<option value="FEMALE">หญิง</option>
					</select>
					{#if errors.gender}
						<label class="label">
							<span class="label-text-alt text-error">{errors.gender}</span>
						</label>
					{/if}
				</div>

				<!-- First Name -->
				<div class="form-control">
					<label class="label" for="firstName">
						<span class="label-text">ชื่อ <span class="text-error">*</span></span>
					</label>
					<input
						type="text"
						id="firstName"
						bind:value={$form.firstName}
						class="input input-bordered {errors.firstName ? 'input-error' : ''}"
						required
					/>
					{#if errors.firstName}
						<label class="label">
							<span class="label-text-alt text-error">{errors.firstName}</span>
						</label>
					{/if}
				</div>

				<!-- Last Name -->
				<div class="form-control">
					<label class="label" for="lastName">
						<span class="label-text">นามสกุล <span class="text-error">*</span></span>
					</label>
					<input
						type="text"
						id="lastName"
						bind:value={$form.lastName}
						class="input input-bordered {errors.lastName ? 'input-error' : ''}"
						required
					/>
					{#if errors.lastName}
						<label class="label">
							<span class="label-text-alt text-error">{errors.lastName}</span>
						</label>
					{/if}
				</div>

				<!-- Birth Date -->
				<div class="form-control">
					<label class="label" for="birthDate">
						<span class="label-text">วันเกิด</span>
					</label>
					<input
						type="date"
						id="birthDate"
						bind:value={$form.birthDate}
						class="input input-bordered"
					/>
				</div>

				<!-- Nationality -->
				<div class="form-control">
					<label class="label" for="nationality">
						<span class="label-text">สัญชาติ</span>
					</label>
					<input
						type="text"
						id="nationality"
						bind:value={$form.nationality}
						class="input input-bordered"
						placeholder="ไทย"
					/>
				</div>

				<!-- Marital Status -->
				<div class="form-control">
					<label class="label" for="maritalStatus">
						<span class="label-text">สถานภาพ</span>
					</label>
					<select id="maritalStatus" bind:value={$form.maritalStatus} class="select select-bordered">
						<option value="">เลือกสถานภาพ</option>
						{#each data.masterData.MARITAL_STATUS || [] as status}
							<option value={status.value}>{status.value}</option>
						{/each}
					</select>
				</div>

				<!-- Occupation -->
				<div class="form-control">
					<label class="label" for="occupation">
						<span class="label-text">อาชีพ</span>
					</label>
					<input
						type="text"
						id="occupation"
						bind:value={$form.occupation}
						class="input input-bordered"
					/>
				</div>

				<!-- Phone -->
				<div class="form-control">
					<label class="label" for="phone">
						<span class="label-text">เบอร์โทรศัพท์</span>
					</label>
					<input
						type="tel"
						id="phone"
						bind:value={$form.phone}
						class="input input-bordered"
						placeholder="08X-XXX-XXXX"
					/>
				</div>
			</div>

			<!-- Address Section -->
			<div class="divider"></div>
			<h3 class="font-semibold mb-4">ที่อยู่ตามทะเบียนบ้าน</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Address No -->
				<div class="form-control">
					<label class="label" for="addressNo">
						<span class="label-text">บ้านเลขที่</span>
					</label>
					<input
						type="text"
						id="addressNo"
						bind:value={$form.addressNo}
						class="input input-bordered"
					/>
				</div>

				<!-- Moo -->
				<div class="form-control">
					<label class="label" for="moo">
						<span class="label-text">หมู่ที่</span>
					</label>
					<input type="text" id="moo" bind:value={$form.moo} class="input input-bordered" />
				</div>

				<!-- Road -->
				<div class="form-control">
					<label class="label" for="road">
						<span class="label-text">ถนน</span>
					</label>
					<input type="text" id="road" bind:value={$form.road} class="input input-bordered" />
				</div>

				<!-- Postal Code -->
				<div class="form-control">
					<label class="label" for="postalCode">
						<span class="label-text">รหัสไปรษณีย์</span>
					</label>
					<input
						type="text"
						id="postalCode"
						bind:value={$form.postalCode}
						class="input input-bordered"
						maxlength="5"
					/>
				</div>

				<!-- Province -->
				<div class="form-control">
					<label class="label" for="provinceId">
						<span class="label-text">จังหวัด</span>
					</label>
					<select
						id="provinceId"
						bind:value={$form.provinceId}
						class="select select-bordered"
					>
						<option value="0">เลือกจังหวัด</option>
						{#each data.provinces as province}
							<option value={province.id}>{province.nameTh}</option>
						{/each}
					</select>
				</div>

				<!-- Amphoe -->
				<div class="form-control">
					<label class="label" for="amphoeId">
						<span class="label-text">อำเภอ/เขต</span>
					</label>
					<select
						id="amphoeId"
						bind:value={$form.amphoeId}
						class="select select-bordered"
						disabled={!$form.provinceId || $form.provinceId === 0}
					>
						<option value="0">เลือกอำเภอ/เขต</option>
						{#each amphoes as amphoe}
							<option value={amphoe.id}>{amphoe.nameTh}</option>
						{/each}
					</select>
				</div>

				<!-- Tambon -->
				<div class="form-control">
					<label class="label" for="tambonId">
						<span class="label-text">ตำบล/แขวง</span>
					</label>
					<select
						id="tambonId"
						bind:value={$form.tambonId}
						class="select select-bordered"
						disabled={!$form.amphoeId || $form.amphoeId === 0}
					>
						<option value="0">เลือกตำบล/แขวง</option>
						{#each tambons as tambon}
							<option value={tambon.id}>{tambon.nameTh}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex gap-2 justify-end mt-6">
				<a href="/dashboard/patients" class="btn btn-ghost">ยกเลิก</a>
				<button type="submit" class="btn btn-primary" disabled={$delayed}>
					{$delayed ? 'กำลังบันทึก...' : 'บันทึก'}
				</button>
			</div>
		</div>
	</form>
</div>


