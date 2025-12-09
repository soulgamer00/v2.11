import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ฟังก์ชันช่วยโหลดไฟล์ Font และแปลงเป็น Base64
const loadFont = async (path: string): Promise<string> => {
	const response = await fetch(path);
	const blob = await response.blob();
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64data = (reader.result as string).split(',')[1];
			resolve(base64data);
		};
		reader.readAsDataURL(blob);
	});
};

// Helper function to load image as base64
const loadImage = async (path: string): Promise<string> => {
	const response = await fetch(path);
	const blob = await response.blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			resolve(result);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
};

export const generateReportPDF = async (
	data: {
		summary: {
			totalCases: number;
			recovered: number;
			underTreatment: number;
			died: number;
		};
		ageDistribution: number[];
		diseaseDistribution: Array<{ disease: string; count: number }>;
		monthlyTrend: number[];
		morbidityRates: Array<{
			disease: string;
			cases: number;
			population: number;
			rate: number;
		}>;
		selectedHospitalName?: string | null;
		selectedYear?: number;
		population?: number;
	},
	chartImages?: {
		ageChart?: string;
		diseaseChart?: string;
		trendChart?: string;
	},
	action: 'save' | 'preview' = 'save'
): Promise<string | void> => {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	try {
		// 1. โหลดและตั้งค่า Font
		const fontPath = encodeURI('/fonts/TH Sarabun New Regular.ttf');
		const fontBase64 = await loadFont(fontPath);

		doc.addFileToVFS('Sarabun.ttf', fontBase64);
		doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
		doc.setFont('Sarabun');

		// ================= HEADER (White theme) =================
		const headerHeight = 45;
		
		// White header background
		doc.setFillColor(255, 255, 255); // White
		doc.rect(0, 0, 210, headerHeight, 'F');
		
		// Gray border line at bottom of header
		doc.setDrawColor(200, 200, 200);
		doc.setLineWidth(1);
		doc.line(0, headerHeight, 210, headerHeight);
		
		// Load and add logo (left side)
		let logoLoaded = false;
		try {
			// Try multiple possible paths
			const logoPaths = ['/logo/logo.png', '/static/logo/logo.png', 'logo/logo.png'];
			let logoData: string | null = null;
			
			for (const path of logoPaths) {
				try {
					logoData = await loadImage(path);
					break;
				} catch (e) {
					continue;
				}
			}
			
			if (logoData) {
				const logoWidth = 30; // mm
				const logoHeight = 30; // mm
				const logoX = 14 + 5;
				const logoY = (headerHeight - logoHeight) / 2;
				doc.addImage(logoData, 'PNG', logoX, logoY, logoWidth, logoHeight);
				logoLoaded = true;
			}
		} catch (error) {
			console.warn('Failed to load logo:', error);
		}
		
		// Organization name (top, dark text on white background)
		doc.setTextColor(0, 0, 0);
		doc.setFontSize(18);
		doc.setFont('Sarabun', 'normal');
		doc.text('สำนักงานสาธารณสุขอำเภอวิเชียรบุรี', 105, 15, { align: 'center' });
		
		// Report title (middle, dark text)
		doc.setFontSize(16);
		doc.setFont('Sarabun', 'normal');
		doc.text('รายงานสรุปสถานการณ์โรคติดต่อ', 105, 28, { align: 'center' });
		
		// Hospital and year info (bottom, gray text)
		doc.setFontSize(11);
		doc.setTextColor(100, 100, 100);
		const hospitalLabel = data.selectedHospitalName || 'ภาพรวมทุกหน่วยงาน';
		const yearLabel = data.selectedYear ? `ปีงบประมาณ: ${data.selectedYear + 543}` : '';
		const headerInfoText = `${hospitalLabel} | ${yearLabel}`;
		doc.text(headerInfoText, 105, 38, { align: 'center' });

		// ข้อมูลทั่วไป (สีดำ)
		doc.setTextColor(0, 0, 0);
		let yPos = headerHeight + 12;

		// Info box with light green background (Ministry style)
		doc.setFillColor(232, 245, 233); // Very light green #E8F5E9
		doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F');
		
		doc.setTextColor(45, 122, 50); // Ministry green text
		doc.setFontSize(11);
		doc.setFont('Sarabun', 'normal');
		// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
		const now = new Date();
		const thaiDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
		const popText = data.population ? `ประชากร: ${data.population.toLocaleString('th-TH')} คน` : '';
		const infoText = `${popText} | วันที่ออกรายงาน: ${thaiDate}`;
		doc.text(infoText, 105, yPos + 6, { align: 'center' });

		yPos += 12;

		// ================= SUMMARY CARDS (DASHBOARD STYLE) =================
		// สร้างกล่องสี่เหลี่ยม 4 กล่องเรียงกัน
		const cardWidth = 42;
		const cardHeight = 25;
		const gap = 6;
		let xCard = 14;

		const cards = [
			{ title: 'รายงานทั้งหมด', value: data.summary.totalCases, color: [45, 122, 50] }, // Ministry Green
			{ title: 'หายแล้ว', value: data.summary.recovered, color: [76, 175, 80] },      // Medium Green
			{ title: 'รักษาอยู่', value: data.summary.underTreatment, color: [129, 199, 132] }, // Light Green
			{ title: 'เสียชีวิต', value: data.summary.died, color: [211, 47, 47] }            // Red (slightly adjusted)
		];

		cards.forEach((card, index) => {
			// Card Background (Full fill for Ministry theme)
			doc.setFillColor(card.color[0], card.color[1], card.color[2]);
			doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 3, 3, 'F');
			
			// Title (white text on colored background)
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(11);
			doc.setFont('Sarabun', 'normal');
			doc.text(card.title, xCard + cardWidth / 2, yPos + 6, { align: 'center' });

			// Value (white text for dark cards, black for light cards)
			const isLightCard = index === 2; // Light green card
			doc.setTextColor(isLightCard ? 0 : 255, isLightCard ? 0 : 255, isLightCard ? 0 : 255);
			doc.setFontSize(22);
			doc.text(card.value.toString(), xCard + cardWidth / 2, yPos + 20, { align: 'center' });

			xCard += cardWidth + gap;
		});

		yPos += cardHeight + 12;

		// ================= SECTION 1: AGE DISTRIBUTION (Chart Left, Table Right) =================
		// ตรวจสอบหน้าใหม่
		if (yPos + 70 > 280) { doc.addPage(); yPos = 20; }

		// Section header with Ministry green background
		doc.setFillColor(45, 122, 50); // Ministry Green
		doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(14);
		doc.setFont('Sarabun', 'normal');
		doc.text('1. การกระจายตามกลุ่มอายุ', 16, yPos + 5.5);
		yPos += 12;

		const startYSection1 = yPos;

		// Chart (Left)
		if (chartImages?.ageChart) {
			doc.addImage(chartImages.ageChart, 'PNG', 14, yPos, 95, 50);
		}

		// Table (Right)
		const ageLabels = ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '60+'];
		const ageData = ageLabels.map((label, index) => [label, data.ageDistribution[index].toString()]);

		autoTable(doc, {
			startY: yPos,
			margin: { left: 115 }, // ขยับตารางไปด้านขวา
			head: [['กลุ่มอายุ', 'จำนวน']],
			body: ageData,
			theme: 'grid',
			headStyles: { fillColor: [45, 122, 50], textColor: 255, font: 'Sarabun', halign: 'center' },
			bodyStyles: { font: 'Sarabun', halign: 'center' },
			styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
			tableWidth: 80
		});

		// หาจุดต่ำสุดระหว่างกราฟกับตาราง เพื่อเริ่ม section ถัดไป
		yPos = Math.max(yPos + 55, (doc as any).lastAutoTable.finalY + 10);


		// ================= SECTION 2: DISEASE DISTRIBUTION (Chart Left, Table Right) =================
		if (yPos + 70 > 280) { doc.addPage(); yPos = 20; }

		// Section header with Ministry green background
		doc.setFillColor(76, 175, 80); // Medium Green
		doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(14);
		doc.setFont('Sarabun', 'normal');
		// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
		doc.text('2. การกระจายตามโรค', 16, yPos + 5.5);
		yPos += 12;

		// Chart (Left)
		if (chartImages?.diseaseChart) {
			// ปรับขนาด Pie Chart ให้เหมาะสม
			doc.addImage(chartImages.diseaseChart, 'PNG', 20, yPos, 85, 50);
		}

		// Table (Right)
		const diseaseData = data.diseaseDistribution.map((d) => [d.disease, d.count.toString()]);
		autoTable(doc, {
			startY: yPos,
			margin: { left: 115 },
			head: [['โรค', 'จำนวน']],
			body: diseaseData,
			theme: 'grid',
			headStyles: { fillColor: [76, 175, 80], textColor: 255, font: 'Sarabun', halign: 'center' }, // Medium Green header
			bodyStyles: { font: 'Sarabun', halign: 'center' },
			styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
			tableWidth: 80
		});

		yPos = Math.max(yPos + 55, (doc as any).lastAutoTable.finalY + 10);

		// ================= SECTION 3: MONTHLY TREND (Full Width) =================
		if (yPos + 80 > 280) { doc.addPage(); yPos = 20; }

		// Section header with Ministry green background
		doc.setFillColor(129, 199, 132); // Light Green
		doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F');
		doc.setTextColor(0, 0, 0); // Black text on light background
		doc.setFontSize(14);
		doc.setFont('Sarabun', 'normal');
		// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
		doc.text('3. แนวโน้มรายเดือน', 16, yPos + 5.5);
		yPos += 12;

		// Chart Full Width
		if (chartImages?.trendChart) {
			doc.addImage(chartImages.trendChart, 'PNG', 14, yPos, 182, 60);
			yPos += 65;
		}

		// Optional: Table for months below chart (Small)
		const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
		// แบ่งเป็น 2 แถว แถวละ 6 เดือนเพื่อให้ประหยัดที่
		const row1Months = monthLabels.slice(0, 6);
		const row1Values = data.monthlyTrend.slice(0, 6).map(v => v.toString());
		const row2Months = monthLabels.slice(6, 12);
		const row2Values = data.monthlyTrend.slice(6, 12).map(v => v.toString());

		autoTable(doc, {
			startY: yPos,
			head: [row1Months, row2Months],
			body: [row1Values, row2Values],
			theme: 'plain', // ตารางแบบเรียบๆ
			headStyles: { font: 'Sarabun', fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1 },
			bodyStyles: { font: 'Sarabun', halign: 'center', lineWidth: 0.1 },
			styles: { fontSize: 9, cellPadding: 1 }
		});
		yPos = (doc as any).lastAutoTable.finalY + 10;

		// ================= SECTION 4: MORBIDITY RATE =================
		if (data.morbidityRates.length > 0) {
			if (yPos + 40 > 280) { doc.addPage(); yPos = 20; }

			// Section header with Ministry green background
			doc.setFillColor(45, 122, 50); // Ministry Green
			doc.roundedRect(14, yPos, 182, 8, 2, 2, 'F');
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(14);
			doc.setFont('Sarabun', 'normal');
			// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
			doc.text('4. อัตราป่วยต่อแสนประชากร (Morbidity Rate)', 16, yPos + 5.5);
			yPos += 12;

			const morbidityData = data.morbidityRates.map((rate) => [
				rate.disease,
				rate.cases.toString(),
				rate.population.toLocaleString('th-TH'),
				rate.rate.toFixed(2)
			]);

			autoTable(doc, {
				startY: yPos,
				head: [['โรค', 'จำนวนผู้ป่วย', 'ประชากร', 'อัตราป่วย (ต่อแสน)']],
				body: morbidityData,
				theme: 'striped',
				headStyles: { fillColor: [45, 122, 50], textColor: 255, font: 'Sarabun', halign: 'center' }, // Ministry Green header
				bodyStyles: { font: 'Sarabun', halign: 'center' },
				columnStyles: {
					0: { halign: 'left' },
					1: { halign: 'right' },
					2: { halign: 'right' },
					3: { halign: 'right', fontStyle: 'bold' }
				},
				styles: { font: 'Sarabun', fontSize: 11 }
			});
		}

		// ================= FOOTER =================
		const pageCount = doc.getNumberOfPages();
		for (let i = 1; i <= pageCount; i++) {
			doc.setPage(i);
			doc.setFontSize(10);
			doc.setTextColor(150);
			doc.text(
				`หน้า ${i} จาก ${pageCount} | รายงานสถานการณ์โรคติดต่อนำโดยแมลง สำนักงานสาธารณสุขอำเภอวิเชียรบุรี`,
				105,
				290,
				{ align: 'center' }
			);
		}

		// Handle action: save or preview
		if (action === 'preview') {
			// Generate blob and create object URL for preview
			const blob = doc.output('blob');
			const url = URL.createObjectURL(blob);
			return url;
		} else {
			// Save File
			const fileName = `รายงานสถานการณ์_${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
			doc.save(fileName);
		}

	} catch (error) {
		console.error('Error generating PDF:', error);
		alert('ไม่สามารถสร้าง PDF ได้: กรุณาตรวจสอบไฟล์ Font หรือข้อมูล');
		throw error;
	}
};