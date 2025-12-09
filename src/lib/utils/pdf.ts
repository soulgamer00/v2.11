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

		// ================= HEADER =================
		// วาดแถบสีด้านบนสุด
		doc.setFillColor(59, 130, 246); // Primary Blue
		doc.rect(0, 0, 210, 15, 'F');

		// ชื่อรายงาน
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(24);
		doc.text('รายงานสรุปสถานการณ์โรคติดต่อ', 105, 10, { align: 'center' });

		// ข้อมูลทั่วไป (สีดำ)
		doc.setTextColor(0, 0, 0);
		let yPos = 25;

		doc.setFontSize(16);
		const hospitalLabel = data.selectedHospitalName || 'ภาพรวมทุกหน่วยงาน';
		doc.text(`หน่วยงาน: ${hospitalLabel}`, 14, yPos);

		const yearLabel = data.selectedYear ? `ประจำปี พ.ศ. ${data.selectedYear + 543}` : '';
		doc.text(yearLabel, 200, yPos, { align: 'right' });

		yPos += 7;
		doc.setFontSize(12);
		doc.setTextColor(100);
		const now = new Date();
		const thaiDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
		
		const popText = data.population ? `ประชากร: ${data.population.toLocaleString('th-TH')} คน` : '';
		doc.text(`${popText} | วันที่ออกรายงาน: ${thaiDate}`, 14, yPos);

		// เส้นคั่น
		yPos += 3;
		doc.setDrawColor(200);
		doc.setLineWidth(0.5);
		doc.line(14, yPos, 196, yPos);
		yPos += 10;

		// ================= SUMMARY CARDS (DASHBOARD STYLE) =================
		// สร้างกล่องสี่เหลี่ยม 4 กล่องเรียงกัน
		const cardWidth = 42;
		const cardHeight = 25;
		const gap = 6;
		let xCard = 14;

		const cards = [
			{ title: 'รายงานทั้งหมด', value: data.summary.totalCases, color: [59, 130, 246] }, // Blue
			{ title: 'หายแล้ว', value: data.summary.recovered, color: [16, 185, 129] },      // Green
			{ title: 'รักษาอยู่', value: data.summary.underTreatment, color: [245, 158, 11] }, // Orange
			{ title: 'เสียชีวิต', value: data.summary.died, color: [239, 68, 68] }            // Red
		];

		cards.forEach((card) => {
			// Card Background (Light)
			doc.setFillColor(card.color[0], card.color[1], card.color[2]);
			doc.setDrawColor(card.color[0], card.color[1], card.color[2]);
			doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 2, 2, 'D'); // Border only
			
			// Fill header part slightly
			doc.rect(xCard, yPos, cardWidth, 8, 'F');

			// Title
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(12);
			doc.text(card.title, xCard + cardWidth / 2, yPos + 5.5, { align: 'center' });

			// Value
			doc.setTextColor(card.color[0], card.color[1], card.color[2]);
			doc.setFontSize(22);
			doc.text(card.value.toString(), xCard + cardWidth / 2, yPos + 19, { align: 'center' });

			xCard += cardWidth + gap;
		});

		yPos += cardHeight + 12;

		// ================= SECTION 1: AGE DISTRIBUTION (Chart Left, Table Right) =================
		// ตรวจสอบหน้าใหม่
		if (yPos + 70 > 280) { doc.addPage(); yPos = 20; }

		doc.setFillColor(240, 240, 240);
		doc.rect(14, yPos, 182, 8, 'F');
		doc.setTextColor(0);
		doc.setFontSize(14);
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
			headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', halign: 'center' },
			bodyStyles: { font: 'Sarabun', halign: 'center' },
			styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
			tableWidth: 80
		});

		// หาจุดต่ำสุดระหว่างกราฟกับตาราง เพื่อเริ่ม section ถัดไป
		yPos = Math.max(yPos + 55, (doc as any).lastAutoTable.finalY + 10);


		// ================= SECTION 2: DISEASE DISTRIBUTION (Chart Left, Table Right) =================
		if (yPos + 70 > 280) { doc.addPage(); yPos = 20; }

		doc.setFillColor(240, 240, 240);
		doc.rect(14, yPos, 182, 8, 'F');
		doc.setTextColor(0);
		doc.setFontSize(14);
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
			headStyles: { fillColor: [16, 185, 129], font: 'Sarabun', halign: 'center' }, // Green header
			bodyStyles: { font: 'Sarabun', halign: 'center' },
			styles: { font: 'Sarabun', fontSize: 10, cellPadding: 2 },
			tableWidth: 80
		});

		yPos = Math.max(yPos + 55, (doc as any).lastAutoTable.finalY + 10);

		// ================= SECTION 3: MONTHLY TREND (Full Width) =================
		if (yPos + 80 > 280) { doc.addPage(); yPos = 20; }

		doc.setFillColor(240, 240, 240);
		doc.rect(14, yPos, 182, 8, 'F');
		doc.setTextColor(0);
		doc.setFontSize(14);
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

			doc.setFillColor(240, 240, 240);
			doc.rect(14, yPos, 182, 8, 'F');
			doc.setTextColor(0);
			doc.setFontSize(14);
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
				headStyles: { fillColor: [50, 50, 50], font: 'Sarabun', halign: 'center' }, // Dark header
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
				`หน้า ${i} จาก ${pageCount} | VBD-DB Report System`,
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