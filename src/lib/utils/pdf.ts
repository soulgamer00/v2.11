import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ฟังก์ชันช่วยโหลดไฟล์ Font และแปลงเป็น Base64
const loadFont = async (path: string): Promise<string> => {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // ตัดส่วน "data:font/ttf;base64," ออก ให้เหลือแต่ตัวเนื้อ Base64
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
	}
) => {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	try {
		// 1. โหลด Font จากไฟล์ใน static folder
		// ใช้ encodeURIComponent เพื่อจัดการกับช่องว่างในชื่อไฟล์
		const fontPath = encodeURI('/fonts/TH Sarabun New Regular.ttf');
		const fontBase64 = await loadFont(fontPath);

		// 2. ลงทะเบียน Font
		doc.addFileToVFS('Sarabun.ttf', fontBase64);
		doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
		doc.setFont('Sarabun');

		// --- ส่วนหัวรายงาน ---
		doc.setFontSize(20);
		doc.text('รายงานและสถิติโรคติดต่อ', 105, 15, { align: 'center' });

		// Add hospital name or "ทั้งหมด"
		doc.setFontSize(14);
		const hospitalLabel = data.selectedHospitalName || 'ทั้งหมด';
		doc.text(`หน่วยงาน: ${hospitalLabel}`, 105, 22, { align: 'center' });

		// Add year and population
		doc.setFontSize(12);
		const yearLabel = data.selectedYear ? `ปี พ.ศ. ${data.selectedYear + 543}` : '';
		const populationLabel = data.population ? `ประชากร: ${data.population.toLocaleString('th-TH')} คน` : '';
		doc.text(yearLabel, 105, 28, { align: 'center' });
		if (populationLabel) {
			doc.text(populationLabel, 105, 34, { align: 'center' });
		}

		// Add date
		doc.setFontSize(10);
		const now = new Date();
		const thaiDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
		doc.text(`วันที่ออกรายงาน: ${thaiDate}`, 105, data.population ? 40 : 34, { align: 'center' });

		let yPos = data.population ? 45 : 40;

		// Summary Section
		doc.setFontSize(16);
		doc.text('สรุปข้อมูล', 14, yPos);
		yPos += 10;

		doc.setFontSize(11);
		const summaryData = [
			['รายงานทั้งหมด', data.summary.totalCases.toString()],
			['หายแล้ว', data.summary.recovered.toString()],
			['รักษาอยู่', data.summary.underTreatment.toString()],
			['เสียชีวิต', data.summary.died.toString()]
		];

		autoTable(doc, {
			startY: yPos,
			head: [['รายการ', 'จำนวน']],
			body: summaryData,
			theme: 'striped',
			headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', textColor: 255 },
			bodyStyles: { font: 'Sarabun' },
			styles: { font: 'Sarabun', fontStyle: 'normal' }
		});

		yPos = (doc as any).lastAutoTable.finalY + 15;

		// Age Distribution Section
		doc.setFontSize(16);
		doc.text('การกระจายตามกลุ่มอายุ', 14, yPos);
		yPos += 10;

		// Add chart image if available
		if (chartImages?.ageChart) {
			try {
				// Check if we need a new page (chart height ~50mm + title ~10mm = 60mm needed)
				if (yPos + 60 > 270) {
					doc.addPage();
					yPos = 20;
					doc.setFontSize(16);
					doc.text('การกระจายตามกลุ่มอายุ (ต่อ)', 14, yPos);
					yPos += 10;
				}
				// Chart size: width 160mm (fits A4), height 50mm (readable)
				doc.addImage(chartImages.ageChart, 'PNG', 14, yPos, 160, 50);
				yPos += 55;
			} catch (error) {
				console.error('Error adding age chart image:', error);
				yPos += 10;
			}
		} else {
			yPos += 10;
		}

		const ageLabels = ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '60+'];
		const ageData = ageLabels.map((label, index) => [
			label,
			data.ageDistribution[index].toString()
		]);

		autoTable(doc, {
			startY: yPos,
			head: [['กลุ่มอายุ', 'จำนวนผู้ป่วย']],
			body: ageData,
			theme: 'striped',
			headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', textColor: 255 },
			bodyStyles: { font: 'Sarabun' },
			styles: { font: 'Sarabun', fontStyle: 'normal' }
		});

		yPos = (doc as any).lastAutoTable.finalY + 15;

		// Disease Distribution Section
		// Check if we need a new page before adding section
		if (yPos + 70 > 270) {
			doc.addPage();
			yPos = 20;
		}
		
		doc.setFontSize(16);
		doc.text('การกระจายตามโรค', 14, yPos);
		yPos += 10;

		// Add chart image if available
		if (chartImages?.diseaseChart) {
			try {
				// Check if we need a new page for chart (chart height ~50mm + title ~10mm = 60mm needed)
				if (yPos + 60 > 270) {
					doc.addPage();
					yPos = 20;
					doc.setFontSize(16);
					doc.text('การกระจายตามโรค (ต่อ)', 14, yPos);
					yPos += 10;
				}
				// Chart size: width 160mm (fits A4), height 50mm (readable, not too small)
				// Pie chart should be square-ish, so we'll use 140x50 to maintain aspect ratio better
				doc.addImage(chartImages.diseaseChart, 'PNG', 14, yPos, 140, 50);
				yPos += 55;
			} catch (error) {
				console.error('Error adding disease chart image:', error);
				yPos += 10;
			}
		} else {
			yPos += 10;
		}

		const diseaseData = data.diseaseDistribution.map((d) => [
			d.disease,
			d.count.toString()
		]);

		autoTable(doc, {
			startY: yPos,
			head: [['โรค', 'จำนวนผู้ป่วย']],
			body: diseaseData,
			theme: 'striped',
			headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', textColor: 255 },
			bodyStyles: { font: 'Sarabun' },
			styles: { font: 'Sarabun', fontStyle: 'normal' }
		});

		yPos = (doc as any).lastAutoTable.finalY + 15;

		// Monthly Trend Section
		// Check if we need a new page before adding section
		if (yPos + 70 > 270) {
			doc.addPage();
			yPos = 20;
		}
		
		doc.setFontSize(16);
		doc.text('แนวโน้มรายเดือน', 14, yPos);
		yPos += 10;

		// Add chart image if available
		if (chartImages?.trendChart) {
			try {
				// Check if we need a new page for chart (chart height ~50mm + title ~10mm = 60mm needed)
				if (yPos + 60 > 270) {
					doc.addPage();
					yPos = 20;
					doc.setFontSize(16);
					doc.text('แนวโน้มรายเดือน (ต่อ)', 14, yPos);
					yPos += 10;
				}
				// Chart size: width 160mm (fits A4), height 50mm (readable)
				doc.addImage(chartImages.trendChart, 'PNG', 14, yPos, 160, 50);
				yPos += 55;
			} catch (error) {
				console.error('Error adding trend chart image:', error);
				yPos += 10;
			}
		} else {
			yPos += 10;
		}

		const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
		const trendData = monthLabels.map((month, index) => [
			month,
			data.monthlyTrend[index].toString()
		]);

		autoTable(doc, {
			startY: yPos,
			head: [['เดือน', 'จำนวนรายงาน']],
			body: trendData,
			theme: 'striped',
			headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', textColor: 255 },
			bodyStyles: { font: 'Sarabun' },
			styles: { font: 'Sarabun', fontStyle: 'normal' }
		});

		yPos = (doc as any).lastAutoTable.finalY + 15;

		// Morbidity Rate Section
		if (data.morbidityRates.length > 0) {
			// Check if we need a new page
			if (yPos > 250) {
				doc.addPage();
				yPos = 20;
			}

			doc.setFontSize(16);
			doc.text('อัตราป่วย (Morbidity Rate)', 14, yPos);
			yPos += 10;

			const morbidityData = data.morbidityRates.map((rate) => [
				rate.disease,
				rate.cases.toString(),
				rate.population.toLocaleString('th-TH'),
				rate.rate.toFixed(2)
			]);

			autoTable(doc, {
				startY: yPos,
				head: [['โรค', 'จำนวนผู้ป่วย', 'ประชากร', 'อัตราป่วยต่อ 100,000 คน']],
				body: morbidityData,
				theme: 'striped',
				headStyles: { fillColor: [59, 130, 246], font: 'Sarabun', textColor: 255 },
				bodyStyles: { font: 'Sarabun' },
				styles: { font: 'Sarabun', fontStyle: 'normal' },
				columnStyles: {
					2: { halign: 'right' },
					3: { halign: 'right' }
				}
			});
		}

		// Footer
		const pageCount = doc.getNumberOfPages();
		for (let i = 1; i <= pageCount; i++) {
			doc.setPage(i);
			doc.setFontSize(10);
			doc.text(
				`หน้า ${i} จาก ${pageCount}`,
				105,
				287,
				{ align: 'center' }
			);
		}

		// Save the PDF
		const fileName = `รายงาน_${now.getFullYear() + 543}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.pdf`;
		doc.save(fileName);

	} catch (error) {
		console.error('Error generating PDF:', error);
		alert('ไม่สามารถสร้าง PDF ได้: กรุณาตรวจสอบไฟล์ Font');
		throw error;
	}
};