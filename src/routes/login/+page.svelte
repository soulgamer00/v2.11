<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>เข้าสู่ระบบ - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 relative">
	<!-- Theme Toggle Button -->
	<div class="absolute top-4 right-4">
		<ThemeToggle />
	</div>
	
	<div class="card w-full max-w-md bg-base-100 shadow-2xl">
		<div class="card-body">
			<!-- Header -->
			<div class="text-center mb-6">
				<div class="flex justify-center mb-4">
					<div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-primary-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
				</div>
				<h1 class="text-3xl font-bold text-primary">รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</h1>
				<p class="text-sm text-base-content/60 mt-2">ระบบฐานข้อมูลโรคติดต่อนำโดยแมลง</p>
			</div>

			<!-- Login Form -->
			<form method="POST" use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					loading = false;
					// Handle redirect result
					if (result.type === 'redirect') {
						// Use window.location for redirect to avoid JSON parsing issues
						window.location.href = result.location || '/dashboard';
						return;
					}
					// Handle errors
					if (result.type === 'failure') {
						await update();
					}
					// Handle success
					if (result.type === 'success') {
						await update();
					}
				};
			}}>
				<!-- Error Alert -->
				{#if form?.error}
					<div class="alert alert-error mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{form.error}</span>
					</div>
				{/if}

				<!-- Username -->
				<div class="form-control">
					<label class="label" for="username">
						<span class="label-text">ชื่อผู้ใช้</span>
					</label>
					<input
						type="text"
						id="username"
						name="username"
						class="input input-bordered"
						placeholder="กรอกชื่อผู้ใช้"
						required
						autocomplete="username"
					/>
				</div>

				<!-- Password -->
				<div class="form-control mt-4">
					<label class="label" for="password">
						<span class="label-text">รหัสผ่าน</span>
					</label>
					<input
						type="password"
						id="password"
						name="password"
						class="input input-bordered"
						placeholder="กรอกรหัสผ่าน"
						required
						autocomplete="current-password"
					/>
				</div>

				<!-- Submit Button -->
				<div class="form-control mt-6">
					<button type="submit" class="btn btn-primary" disabled={loading}>
						{#if loading}
							<span class="loading loading-spinner"></span>
						{/if}
						เข้าสู่ระบบ
					</button>
				</div>
			</form>

			<!-- Info -->
			<div class="divider"></div>
			<div class="text-center text-sm text-base-content/60">
				<p>บัญชีทดสอบ:</p>
				<p class="font-mono mt-1">superadmin / admin123</p>
			</div>
		</div>
	</div>
</div>

