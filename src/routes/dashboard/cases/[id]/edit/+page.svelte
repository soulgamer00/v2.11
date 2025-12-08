<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import AutocompleteSearch from '$lib/components/AutocompleteSearch.svelte';

	let { data }: { data: PageData } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		dataType: 'json',
		onResult: ({ result }) => {
			if (result.type === 'success') {
				alert('บันทึกข้อมูลสำเร็จ');
				window.location.href = '/dashboard/cases';
			} else if (result.type === 'failure' || result.type === 'error') {
				console.error('Form submission failed:', result);
				alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาตรวจสอบความถูกต้อง');
			}
		},
		onError: ({ result }) => {
			console.error('Form error:', result);
			alert('เกิดข้อผิดพลาดที่ไม่คาดคิด: ' + result.error.message);
		}
	});

	let amphoes = $state<any[]>([]);
	let tambons = $state<any[]>([]);
	let sickAmphoes = $state<any[]>([]);
	let sickTambons = $state<any[]>([]);

	// Load amphoes
	async function loadAmphoes(provinceId: number) {
		const response = await fetch(`/api/geo/amphoes?provinceId=${provinceId}`);
		if (response.ok) {
			amphoes = await response.json();
		}
	}

	// Load tambons
	async function loadTambons(amphoeId: number) {
		const response = await fetch(`/api/geo/tambons?amphoeId=${amphoeId}`);
		if (response.ok) {
			tambons = await response.json();
		}
	}

	// Load sick amphoes
	async function loadSickAmphoes(provinceId: number) {
		const response = await fetch(`/api/geo/amphoes?provinceId=${provinceId}`);
		if (response.ok) {
			sickAmphoes = await response.json();
		}
	}

	// Load sick tambons
	async function loadSickTambons(amphoeId: number) {
		const response = await fetch(`/api/geo/tambons?amphoeId=${amphoeId}`);
		if (response.ok) {
			sickTambons = await response.json();
		}
	}

	// Initial load
	onMount(async () => {
		try {
			if ($form.patient.provinceId) await loadAmphoes($form.patient.provinceId);
			if ($form.patient.amphoeId) await loadTambons($form.patient.amphoeId);
			
			if ($form.sickProvinceId) await loadSickAmphoes($form.sickProvinceId);
			if ($form.sickAmphoeId) await loadSickTambons($form.sickAmphoeId);
		} catch (e) {
			console.error("Error loading initial geo data:", e);
		}
	});

	// Handle province select
	async function handleProvinceSelect(province: any) {
		if (province && province.id) {
			$form.patient.provinceId = province.id;
			await loadAmphoes(province.id);
			$form.patient.amphoeId = 0;
			$form.patient.tambonId = 0;
		}
	}

	// Handle amphoe select
	async function handleAmphoeSelect(amphoe: any) {
		if (amphoe && amphoe.id) {
			$form.patient.amphoeId = amphoe.id;
			await loadTambons(amphoe.id);
			$form.patient.tambonId = 0;
		}
	}

	// Handle tambon select
	function handleTambonSelect(tambon: any) {
		if (tambon && tambon.id) {
			$form.patient.tambonId = tambon.id;
			if (tambon.postalCode) {
				$form.patient.postalCode = tambon.postalCode;
			}
		}
	}

	// Handle sick province select
	async function handleSickProvinceSelect(province: any) {
		if (province && province.id) {
			$form.sickProvinceId = province.id;
			await loadSickAmphoes(province.id);
			$form.sickAmphoeId = 0;
			$form.sickTambonId = 0;
		}
	}

	// Handle sick amphoe select
	async function handleSickAmphoeSelect(amphoe: any) {
		if (amphoe && amphoe.id) {
			$form.sickAmphoeId = amphoe.id;
			await loadSickTambons(amphoe.id);
			$form.sickTambonId = 0;
		}
	}

	// Handle sick tambon select
	function handleSickTambonSelect(tambon: any) {
		if (tambon && tambon.id) {
			$form.sickTambonId = tambon.id;
			if (tambon.postalCode) {
				$form.sickPostalCode = tambon.postalCode;
			}
		}
	}

	// Copy address from patient
	function handleUseSameAddress(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.checked) {
			$form.sickAddressNo = $form.patient.addressNo;
			$form.sickMoo = $form.patient.moo;
			$form.sickRoad = $form.patient.road;
			$form.sickPostalCode = $form.patient.postalCode;
			$form.sickProvinceId = $form.patient.provinceId;
			$form.sickAmphoeId = $form.patient.amphoeId;
			$form.sickTambonId = $form.patient.tambonId;

			if ($form.patient.provinceId) {
				loadSickAmphoes($form.patient.provinceId);
			}
			if ($form.patient.amphoeId) {
				loadSickTambons($form.patient.amphoeId);
			}
		}
	}
</script>

<svelte:head>
	<title>แก้ไขรายงานผู้ป่วย - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h1 class="text-3xl font-bold">แก้ไขรายงานผู้ป่วย</h1>
			<p class="text-xs text-base-content/40">Ref: {data.caseId}</p>
		</div>
		<a href="/dashboard/cases" class="btn">ยกเลิก</a>
	</div>

	<form method="POST" action="?/update" use:enhance class="space-y-8">
		
		<!-- Part 1: Patient Info -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-primary border-b pb-2">ข้อมูลผู้ป่วย</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- ID Card -->
					<div class="form-control md:col-span-2">
						<label class="label" for="idCard">
							<span class="label-text">เลขบัตรประชาชน</span>
						</label>
						<input
							type="text"
							id="idCard"
							bind:value={$form.patient.idCard}
							class="input input-bordered"
							placeholder="กรอก 13 หลัก (ถ้ามี)"
							maxlength="13"
						/>
					</div>

					<!-- Prefix -->
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.prefix}
							label="คำนำหน้า"
							placeholder="เลือกคำนำหน้า"
							clientData={data.masterData?.PREFIX || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={(item) => {
								if (item?.value) {
									$form.patient.prefix = item.value;
								}
							}}
							displayFn={(item) => item?.value || ''}
							size="sm"
						/>
					</div>

					<!-- Gender -->
					<div class="form-control">
						<label class="label" for="gender">
							<span class="label-text">เพศ <span class="text-error">*</span></span>
						</label>
						<select
							id="gender"
							bind:value={$form.patient.gender}
							class="select select-bordered"
							required
						>
							<option value="">เลือกเพศ</option>
							<option value="MALE">ชาย</option>
							<option value="FEMALE">หญิง</option>
						</select>
					</div>

					<!-- First Name -->
					<div class="form-control">
						<label class="label" for="firstName">
							<span class="label-text">ชื่อ <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="firstName"
							bind:value={$form.patient.firstName}
							class="input input-bordered"
							required
						/>
					</div>

					<!-- Last Name -->
					<div class="form-control">
						<label class="label" for="lastName">
							<span class="label-text">นามสกุล <span class="text-error">*</span></span>
						</label>
						<input
							type="text"
							id="lastName"
							bind:value={$form.patient.lastName}
							class="input input-bordered"
							required
						/>
					</div>

					<!-- Birth Date -->
					<div class="form-control">
						<label class="label" for="birthDate">
							<span class="label-text">วันเกิด</span>
						</label>
						<input
							type="date"
							id="birthDate"
							bind:value={$form.patient.birthDate}
							class="input input-bordered"
						/>
					</div>

					<!-- Nationality -->
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.nationality}
							label="สัญชาติ"
							placeholder="เลือกสัญชาติ"
							clientData={data.masterData?.NATIONALITY || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={(item) => {
								if (item?.value) {
									$form.patient.nationality = item.value;
								}
							}}
							displayFn={(item) => item?.value || ''}
							size="sm"
						/>
					</div>

					<!-- Occupation -->
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.occupation}
							label="อาชีพ"
							placeholder="เลือกอาชีพ"
							clientData={data.masterData?.OCCUPATION || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={(item) => {
								if (item?.value) {
									$form.patient.occupation = item.value;
								}
							}}
							displayFn={(item) => item?.value || ''}
							size="sm"
						/>
					</div>

					<!-- Marital Status -->
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.maritalStatus}
							label="สถานภาพ"
							placeholder="เลือกสถานภาพ"
							clientData={data.masterData?.MARITAL_STATUS || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.value?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={(item) => {
								if (item?.value) {
									$form.patient.maritalStatus = item.value;
								}
							}}
							displayFn={(item) => item?.value || ''}
							size="sm"
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
							bind:value={$form.patient.phone}
							class="input input-bordered"
						/>
					</div>
				</div>

				<div class="divider text-sm font-semibold">ที่อยู่ตามทะเบียนบ้าน/ที่อยู่ปัจจุบัน</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label"><span>บ้านเลขที่</span></label>
						<input type="text" bind:value={$form.patient.addressNo} class="input input-bordered" />
					</div>
					<div class="form-control">
						<label class="label"><span>หมู่ที่</span></label>
						<input type="text" bind:value={$form.patient.moo} class="input input-bordered" />
					</div>
					<div class="form-control md:col-span-2">
						<label class="label"><span>ถนน</span></label>
						<input type="text" bind:value={$form.patient.road} class="input input-bordered" />
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.provinceId}
							label="จังหวัด"
							placeholder="เลือกจังหวัด"
							clientData={data.provinces || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={handleProvinceSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => `รหัส: ${item?.code || ''}`}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
						/>
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.amphoeId}
							label="อำเภอ/เขต"
							placeholder="เลือกอำเภอ/เขต"
							clientData={amphoes || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={handleAmphoeSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => `รหัส: ${item?.code || ''}`}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
							disabled={!$form.patient.provinceId}
						/>
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.patient.tambonId}
							label="ตำบล/แขวง"
							placeholder="เลือกตำบล/แขวง"
							clientData={tambons || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) ||
									(item.postalCode && item.postalCode.includes(query)) || false;
							}}
							onSelect={handleTambonSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => {
								const details = [];
								if (item?.code) details.push(`รหัส: ${item.code}`);
								if (item?.postalCode) details.push(`ไปรษณีย์: ${item.postalCode}`);
								return details.join(' | ');
							}}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
							disabled={!$form.patient.amphoeId}
						/>
					</div>
					<div class="form-control">
						<label class="label"><span>รหัสไปรษณีย์</span></label>
						<input type="text" bind:value={$form.patient.postalCode} class="input input-bordered" placeholder="เช่น 67000" maxlength="5" />
					</div>
				</div>
			</div>
		</div>

		<!-- Part 2: Case Info -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-primary border-b pb-2">ข้อมูลการเจ็บป่วย</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control md:col-span-2">
						<AutocompleteSearch
							bind:value={$form.hospitalId}
							label="หน่วยงานที่รายงาน"
							placeholder="เลือกหน่วยงาน"
							clientData={data.hospitals || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								const q = query.toLowerCase();
								return item.name?.toLowerCase().includes(q) ||
									item.code9?.toLowerCase().includes(q) ||
									item.code9New?.toLowerCase().includes(q) ||
									item.code5?.toLowerCase().includes(q) || false;
							}}
							onSelect={(item) => {
								if (item?.id) {
									$form.hospitalId = item.id;
								}
							}}
							displayFn={(item) => item?.name || ''}
							detailFn={(item) => {
								const details = [];
								if (item?.code9New) details.push(`รหัส: ${item.code9New}`);
								if (item?.code5) details.push(`รหัส 5 หลัก: ${item.code5}`);
								return details.join(' | ');
							}}
							valueKey="id"
							displayKey="name"
							size="sm"
						/>
					</div>
					<div class="form-control md:col-span-2">
						<AutocompleteSearch
							bind:value={$form.diseaseId}
							label="โรค"
							placeholder="เลือกโรค"
							clientData={data.diseases || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								const q = query.toLowerCase();
								return item.nameTh?.toLowerCase().includes(q) ||
									item.nameEn?.toLowerCase().includes(q) ||
									item.abbreviation?.toLowerCase().includes(q) ||
									item.code?.toLowerCase().includes(q) || false;
							}}
							onSelect={(item) => {
								if (item?.id) {
									$form.diseaseId = item.id;
								}
							}}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => {
								const details = [];
								if (item?.code) details.push(`รหัส: ${item.code}`);
								if (item?.abbreviation) details.push(`ย่อ: ${item.abbreviation}`);
								if (item?.nameEn) details.push(`EN: ${item.nameEn}`);
								return details.join(' | ');
							}}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
						/>
					</div>
					<div class="form-control">
						<label class="label"><span>วันที่เริ่มป่วย <span class="text-error">*</span></span></label>
						<input type="date" bind:value={$form.illnessDate} class="input input-bordered" required />
					</div>
					<div class="form-control">
						<label class="label"><span>วันที่รับการรักษา</span></label>
						<input type="date" bind:value={$form.treatDate} class="input input-bordered" />
					</div>
					<div class="form-control">
						<label class="label"><span>วันที่วินิจฉัย</span></label>
						<input type="date" bind:value={$form.diagnosisDate} class="input input-bordered" />
					</div>
					<div class="form-control">
						<label class="label"><span>ประเภทผู้ป่วย</span></label>
						<select bind:value={$form.patientType} class="select select-bordered">
							<option value="OPD">OPD</option>
							<option value="IPD">IPD</option>
							<option value="ACF">ACF</option>
						</select>
					</div>
					<div class="form-control">
						<label class="label"><span>สถานะ</span></label>
						<select bind:value={$form.condition} class="select select-bordered">
							<option value="UNDER_TREATMENT">รักษาอยู่</option>
							<option value="RECOVERED">หาย</option>
							<option value="DIED">เสียชีวิต</option>
						</select>
					</div>

					<!-- Death Date (Required if DIED) -->
					{#if $form.condition === 'DIED'}
						<div class="form-control">
							<label class="label">
								<span>วันที่เสียชีวิต <span class="text-error">*</span></span>
							</label>
							<input
								type="date"
								bind:value={$form.deathDate}
								class="input input-bordered"
								class:input-error={$errors.deathDate}
								required
							/>
							{#if $errors.deathDate}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.deathDate}</span>
								</label>
							{/if}
						</div>

						<!-- Cause of Death (Required if DIED) -->
						<div class="form-control">
							<label class="label">
								<span>สาเหตุการเสียชีวิต <span class="text-error">*</span></span>
							</label>
							<input
								type="text"
								bind:value={$form.causeOfDeath}
								class="input input-bordered"
								class:input-error={$errors.causeOfDeath}
								placeholder="ระบุสาเหตุการเสียชีวิต"
								required
							/>
							{#if $errors.causeOfDeath}
								<label class="label">
									<span class="label-text-alt text-error">{$errors.causeOfDeath}</span>
								</label>
							{/if}
						</div>
					{/if}

					<div class="form-control">
						<label class="label"><span>ผู้รายงาน</span></label>
						<input type="text" bind:value={$form.reporterName} class="input input-bordered" />
					</div>
				</div>

				<div class="divider text-sm font-semibold">สถานที่ที่ป่วย (ขณะเริ่มป่วย)</div>

				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-2">
						<input type="checkbox" bind:checked={$form.useSameAddress} class="checkbox" onchange={handleUseSameAddress} />
						<span class="label-text">ใช้ที่อยู่เดียวกับที่อยู่ปัจจุบัน</span>
					</label>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label"><span>บ้านเลขที่</span></label>
						<input type="text" bind:value={$form.sickAddressNo} class="input input-bordered" disabled={$form.useSameAddress} />
					</div>
					<div class="form-control">
						<label class="label"><span>หมู่ที่</span></label>
						<input type="text" bind:value={$form.sickMoo} class="input input-bordered" disabled={$form.useSameAddress} />
					</div>
					<div class="form-control md:col-span-2">
						<label class="label"><span>ถนน</span></label>
						<input type="text" bind:value={$form.sickRoad} class="input input-bordered" disabled={$form.useSameAddress} />
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.sickProvinceId}
							label="จังหวัด"
							placeholder="เลือกจังหวัด"
							clientData={data.provinces || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={handleSickProvinceSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => `รหัส: ${item?.code || ''}`}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
							disabled={$form.useSameAddress}
							class={$errors.sickProvinceId ? 'input-error' : ''}
						/>
						{#if $errors.sickProvinceId}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.sickProvinceId}</span>
							</label>
						{/if}
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.sickAmphoeId}
							label="อำเภอ/เขต"
							placeholder="เลือกอำเภอ/เขต"
							clientData={sickAmphoes || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) || false;
							}}
							onSelect={handleSickAmphoeSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => `รหัส: ${item?.code || ''}`}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
							disabled={$form.useSameAddress || !$form.sickProvinceId}
							class={$errors.sickAmphoeId ? 'input-error' : ''}
						/>
						{#if $errors.sickAmphoeId}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.sickAmphoeId}</span>
							</label>
						{/if}
					</div>
					<div class="form-control">
						<AutocompleteSearch
							bind:value={$form.sickTambonId}
							label="ตำบล/แขวง"
							placeholder="เลือกตำบล/แขวง"
							clientData={sickTambons || []}
							clientSearchFn={(item, query) => {
								if (!item || !query) return false;
								return item.nameTh?.toLowerCase().includes(query.toLowerCase()) ||
									item.code?.toLowerCase().includes(query.toLowerCase()) ||
									(item.postalCode && item.postalCode.includes(query)) || false;
							}}
							onSelect={handleSickTambonSelect}
							displayFn={(item) => item?.nameTh || ''}
							detailFn={(item) => {
								const details = [];
								if (item?.code) details.push(`รหัส: ${item.code}`);
								if (item?.postalCode) details.push(`ไปรษณีย์: ${item.postalCode}`);
								return details.join(' | ');
							}}
							valueKey="id"
							displayKey="nameTh"
							size="sm"
							disabled={$form.useSameAddress || !$form.sickAmphoeId}
							class={$errors.sickTambonId ? 'input-error' : ''}
						/>
						{#if $errors.sickTambonId}
							<label class="label">
								<span class="label-text-alt text-error">{$errors.sickTambonId}</span>
							</label>
						{/if}
					</div>
					<div class="form-control">
						<label class="label"><span>รหัสไปรษณีย์</span></label>
						<input type="text" bind:value={$form.sickPostalCode} class="input input-bordered" placeholder="เช่น 67000" maxlength="5" disabled={$form.useSameAddress} />
					</div>
				</div>

				<div class="form-control mt-4">
					<label class="label">
						<span>
							หมายเหตุ
							{#if $form.condition === 'DIED'}
								<span class="text-error">*</span>
							{/if}
						</span>
					</label>
					<textarea
						bind:value={$form.remark}
						class="textarea textarea-bordered"
						class:textarea-error={$errors.remark}
						rows="3"
						placeholder={$form.condition === 'DIED' ? 'กรุณาระบุหมายเหตุเพิ่มเติม' : ''}
						required={$form.condition === 'DIED'}
					></textarea>
					{#if $errors.remark}
						<label class="label">
							<span class="label-text-alt text-error">{$errors.remark}</span>
						</label>
					{/if}
				</div>

				<div class="card-actions justify-end mt-6">
					<button type="submit" class="btn btn-primary btn-lg w-full md:w-auto" disabled={$delayed}>
						{#if $delayed}<span class="loading loading-spinner"></span>{/if}
						บันทึกการแก้ไข
					</button>
				</div>
			</div>
		</div>
	</form>
</div>

