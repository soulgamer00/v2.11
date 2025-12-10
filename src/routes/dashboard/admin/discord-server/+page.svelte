<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icons/Icon.svelte';

	let { data, form }: { data: PageData; form: any } = $props();

	let discordUrl = $state(data.discordServerUrl || '');

</script>

<svelte:head>
	<title>จัดการ Discord Server Link - รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="card bg-base-100 shadow-lg">
		<div class="card-body">
			<h2 class="card-title text-2xl mb-4 flex items-center gap-2">
				<Icon name="discord" size={24} class="text-[#5865F2]" />
				จัดการ Discord Server Link
			</h2>

			<div class="alert alert-info mb-4">
				<Icon name="alert" size={20} />
				<div>
					<p class="font-semibold">คำแนะนำ</p>
					<p class="text-sm">กรอก Discord invite link (เช่น discord.gg/xxxxx หรือ discord.com/invite/xxxxx) เพื่อให้ผู้ใช้สามารถเข้าถึง Discord server ได้จาก navbar</p>
				</div>
			</div>

			{#if form?.message}
				<div class="alert {form.message.includes('สำเร็จ') ? 'alert-success' : 'alert-error'} mb-4">
					<Icon name={form.message.includes('สำเร็จ') ? 'check' : 'alert'} size={20} />
					<span>{form.message}</span>
				</div>
			{/if}
			{#if form?.error}
				<div class="alert alert-error mb-4">
					<Icon name="alert" size={20} />
					<span>{form.error}</span>
				</div>
			{/if}

			<form method="POST" action="?/update" use:enhance={() => {
				return async ({ result, update }) => {
					if (result && result.type === 'success') {
						if (result.data && result.data.success) {
							await update();
							// Use goto with invalidateAll instead of window.location.reload
							await goto('/dashboard/admin/discord-server', { invalidateAll: true });
						} else {
							await update();
						}
					} else {
						await update();
					}
				};
			}}>
				<div class="form-control w-full mb-4">
					<label class="label" for="discordUrl">
						<span class="label-text font-semibold">Discord Server Invite Link</span>
					</label>
					<input
						type="text"
						id="discordUrl"
						name="url"
						bind:value={discordUrl}
						class="input input-bordered w-full"
						placeholder="discord.gg/xxxxx หรือ discord.com/invite/xxxxx"
					/>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							เว้นว่างไว้เพื่อลบ link
						</span>
					</label>
				</div>

				<div class="card-actions justify-end">
					<button type="submit" class="btn btn-primary">
						<Icon name="check" size={18} />
						บันทึก
					</button>
				</div>
			</form>

			{#if data.discordServerUrl}
				<div class="divider my-4">ตัวอย่าง</div>
				<div class="alert alert-success">
					<Icon name="check" size={20} />
					<div class="flex-1">
						<p class="font-semibold">Discord Server Link ถูกตั้งค่าแล้ว</p>
						<a 
							href={data.discordServerUrl} 
							target="_blank" 
							rel="noopener noreferrer"
							class="link link-primary mt-2 inline-flex items-center gap-2"
						>
							<Icon name="discord" size={18} />
							เปิด Discord Server
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

