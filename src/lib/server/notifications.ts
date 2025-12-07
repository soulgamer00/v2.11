import { prisma } from './db';

export interface CaseNotificationData {
	disease: string;
	hospital: string;
	patientType: string | null;
	condition: string | null;
	tambon: string | null;
	amphoe: string | null;
	province: string | null;
	action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT';
	userId: string;
	caseId?: string;
}

/**
 * Send notification to all active users and Discord webhook
 */
export async function notifyCaseAction(data: CaseNotificationData): Promise<void> {
	try {
		// Get all Discord webhook URLs from SystemConfig
		const webhookConfigs = await prisma.systemConfig.findMany({
			where: {
				key: {
					startsWith: 'DISCORD_WEBHOOK_'
				}
			}
		});

		// Get webhook URLs
		let webhookUrls: string[] = webhookConfigs.map(config => config.value).filter(Boolean);

		// Fallback to legacy single webhook or default
		if (webhookUrls.length === 0) {
			const legacyConfig = await prisma.systemConfig.findUnique({
				where: { key: 'DISCORD_WEBHOOK_URL' }
			});
			
			if (legacyConfig) {
				webhookUrls = [legacyConfig.value];
			} else {
				// Use default URL if no webhooks configured
				const defaultUrl = 'https://discord.com/api/webhooks/1446702992601649258/en5ITWTLj0_5h2lAsKTWTjBwlzZ3BwOLEULv84Zool_zKUUJNFWMiJ3ltVcosrDyCqnt';
				webhookUrls = [defaultUrl];
				
				// Try to save default as first webhook
				try {
					await prisma.systemConfig.create({
						data: {
							key: 'DISCORD_WEBHOOK_1',
							value: defaultUrl
						}
					});
				} catch (error) {
					// Ignore if already exists or creation fails
					console.error('Failed to save default webhook:', error);
				}
			}
		}

		// Also check environment variable
		if (process.env.DISCORD_WEBHOOK_URL && !webhookUrls.includes(process.env.DISCORD_WEBHOOK_URL)) {
			webhookUrls.push(process.env.DISCORD_WEBHOOK_URL);
		}

		// Prepare notification message
		const actionText = {
			CREATE: 'เพิ่มรายงานเคสใหม่',
			UPDATE: 'แก้ไขรายงานเคส',
			DELETE: 'ลบรายงานเคส',
			IMPORT: 'นำเข้ารายงานเคส'
		}[data.action];

		const patientTypeText = data.patientType === 'IPD' ? 'ผู้ป่วยใน' : 
		                       data.patientType === 'OPD' ? 'ผู้ป่วยนอก' : 
		                       data.patientType === 'ACF' ? 'ACF' : '-';

		const conditionText = data.condition === 'RECOVERED' ? 'หายแล้ว' :
		                     data.condition === 'DIED' ? 'เสียชีวิต' :
		                     data.condition === 'UNDER_TREATMENT' ? 'อยู่ระหว่างการรักษา' : '-';

		const locationText = [data.tambon, data.amphoe, data.province]
			.filter(Boolean)
			.join(' ');

		// Create notification message
		const caseIdText = data.caseId ? `หมายเลขเคส: ${data.caseId}\n` : '';
		const message = `${actionText}\n` +
			`${caseIdText}` +
			`โรค: ${data.disease}\n` +
			`หน่วยงาน: ${data.hospital}\n` +
			`ประเภทผู้ป่วย: ${patientTypeText}\n` +
			`สถานะ: ${conditionText}\n` +
			`ที่อยู่: ${locationText || '-'}`;

		// Create notifications for all active users
		const activeUsers = await prisma.user.findMany({
			where: { isActive: true },
			select: { id: true }
		});

		await prisma.notification.createMany({
			data: activeUsers.map(user => ({
				userId: user.id,
				title: actionText,
				message: message
			}))
		});

		// Send to all Discord webhooks
		if (webhookUrls.length > 0) {
			const embedFields = [];
			
			// Add case ID if available
			if (data.caseId) {
				embedFields.push({ name: 'หมายเลขเคส', value: data.caseId, inline: false });
			}
			
			embedFields.push(
				{ name: 'โรค', value: data.disease, inline: true },
				{ name: 'หน่วยงาน', value: data.hospital, inline: true },
				{ name: 'ประเภทผู้ป่วย', value: patientTypeText, inline: true },
				{ name: 'สถานะ', value: conditionText, inline: true },
				{ name: 'ตำบล', value: data.tambon || '-', inline: true },
				{ name: 'อำเภอ', value: data.amphoe || '-', inline: true },
				{ name: 'จังหวัด', value: data.province || '-', inline: true }
			);

			const embed = {
				title: actionText,
				color: data.action === 'CREATE' ? 0x00ff00 : 
				       data.action === 'UPDATE' ? 0xffaa00 : 
				       data.action === 'DELETE' ? 0xff0000 : 0x0099ff,
				fields: embedFields,
				timestamp: new Date().toISOString(),
				footer: {
					text: 'รายงานสถานการณ์โรคติดต่อนำโดยแมลง v2.0'
				}
			};

			// Send to all webhooks in parallel
			const webhookPromises = webhookUrls.map(async (webhookUrl) => {
				try {
					await fetch(webhookUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							embeds: [embed]
						})
					});
				} catch (error) {
					console.error(`Failed to send Discord webhook to ${webhookUrl}:`, error);
					// Don't throw - webhook failure shouldn't break the operation
				}
			});

			await Promise.allSettled(webhookPromises);
		}
	} catch (error) {
		console.error('Failed to send notification:', error);
		// Don't throw - notification failure shouldn't break the operation
	}
}

