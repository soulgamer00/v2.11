import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to load font
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

interface DiseaseReportData {
	diseaseName: string;
	diseaseCode: string;
	year: number;
	areaName: string;
	stats: {
		totalCases: number;
		totalPopulation: number;
		incidenceRate: string;
	};
	genderStats: {
		MALE: { count: number; percentage: string };
		FEMALE: { count: number; percentage: string };
		ratio: string;
		total: number;
	};
	occupations: Array<{ name: string; count: number; percentage: string }>;
	ageStats: Array<{
		ageGroup: string;
		count: number;
		died: number;
		morbidityRate: string;
		deathRate: string;
	}>;
	historicalData: Array<{
		year: number;
		totalCases: number;
		morbidityRate: string;
		died: number;
		deathRate: string;
	}>;
}

interface ChartImages {
	trendChart?: string; // Base64 image
	genderChart?: string; // Base64 image
	occupationChart?: string; // Base64 image
}

export const generateDiseaseReportPDF = async (
	data: DiseaseReportData,
	chartImages?: ChartImages,
	action: 'save' | 'preview' = 'save'
): Promise<string | void> => {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 15;
	const contentWidth = pageWidth - margin * 2;

	// Load Thai font
	try {
		const fontPath = encodeURI('/fonts/TH Sarabun New Regular.ttf');
		const fontBase64 = await loadFont(fontPath);
		doc.addFileToVFS('THSarabunNew-Regular.ttf', fontBase64);
		doc.addFont('THSarabunNew-Regular.ttf', 'THSarabunNew', 'normal');
		doc.setFont('THSarabunNew', 'normal');
	} catch (error) {
		console.warn('Failed to load Thai font, using default font:', error);
	}

	let yPos = margin;

	// Header with White theme
	const headerHeight = 45;
	
	// White header background
	doc.setFillColor(255, 255, 255); // White
	doc.rect(0, 0, pageWidth, headerHeight, 'F');
	
	// Gray border line at bottom of header
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(1);
	doc.line(0, headerHeight, pageWidth, headerHeight);
	
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
			const logoX = margin + 5;
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
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
	const orgText = 'สำนักงานสาธารณสุขอำเภอวิเชียรบุรี';
	const orgTextX = logoLoaded ? pageWidth / 2 : pageWidth / 2;
	doc.text(orgText, orgTextX, 15, { align: 'center' });
	
	// Report title (middle, dark text)
	doc.setFontSize(16);
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle
	doc.text(`รายงานสถานการณ์โรค ${data.diseaseName}`, pageWidth / 2, 28, { align: 'center' });
	
	// Disease code and year (bottom, gray text)
	doc.setFontSize(11);
	doc.setTextColor(100, 100, 100);
	const infoText = `รหัสโรค: ${data.diseaseCode} | ปีงบประมาณ: ${data.year + 543}`;
	doc.text(infoText, pageWidth / 2, 38, { align: 'center' });

	yPos = headerHeight + 12;

	// Stats Cards Section - 3 cards in a row (Ministry theme colors)
	doc.setTextColor(0, 0, 0);
	doc.setFontSize(14);
	doc.setFont('THSarabunNew', 'normal');
	
	const cardWidth = (contentWidth - 10) / 3; // 3 cards with spacing
	const cardHeight = 22;
	
	// Total Cases Card (Dark Green - Ministry color)
	doc.setFillColor(45, 122, 50); // Ministry Green #2D7A32
	doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(11);
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle
	doc.text('จำนวนผู้ป่วยทั้งหมด', margin + 5, yPos + 9);
	doc.setFontSize(18);
	// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
	doc.text(data.stats.totalCases.toLocaleString('th-TH') + ' ราย', margin + 5, yPos + 18);

	// Total Population Card (Medium Green)
	doc.setFillColor(76, 175, 80); // Medium Green #4CAF50
	doc.roundedRect(margin + cardWidth + 5, yPos, cardWidth, cardHeight, 3, 3, 'F');
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(11);
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle
	doc.text('จำนวนประชากร', margin + cardWidth + 10, yPos + 9);
	doc.setFontSize(18);
	// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
	doc.text(data.stats.totalPopulation.toLocaleString('th-TH') + ' คน', margin + cardWidth + 10, yPos + 18);

	// Incidence Rate Card (Light Green)
	doc.setFillColor(129, 199, 132); // Light Green #81C784
	doc.roundedRect(margin + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, 3, 3, 'F');
	doc.setTextColor(0, 0, 0); // Black text on light background
	doc.setFontSize(11);
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle
	doc.text('อัตราป่วยต่อแสน', margin + (cardWidth + 5) * 2 + 5, yPos + 9);
	doc.setFontSize(18);
	// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
	doc.text(data.stats.incidenceRate + ' / แสน', margin + (cardWidth + 5) * 2 + 5, yPos + 18);

	yPos += cardHeight + 8;

	// Area and Year Info (Ministry style)
	doc.setTextColor(0, 0, 0);
	doc.setFontSize(11);
	doc.setFont('THSarabunNew', 'normal');
	// Note: jsPDF doesn't support setFontStyle
	
	// Info box with light green background
	doc.setFillColor(232, 245, 233); // Very light green #E8F5E9
	doc.roundedRect(margin, yPos, contentWidth, 8, 2, 2, 'F');
	
	doc.setTextColor(45, 122, 50); // Ministry green text
	// Note: jsPDF doesn't support setFontStyle, using larger font size for emphasis
	const areaInfoText = `พื้นที่: ${data.areaName} | ปีงบประมาณ: ${data.year + 543} | วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}`;
	doc.text(areaInfoText, pageWidth / 2, yPos + 6, { align: 'center' });

	yPos += 12;

	// Section 1: Trend Chart (Full width)
	if (chartImages?.trendChart) {
		doc.setFontSize(12);
		doc.setFont('THSarabunNew', 'normal');
		doc.text('แนวโน้มการเกิดโรครายเดือน และ อัตราป่วย (Incidence Rate)', margin, yPos);
		yPos += 8;

		try {
			const imgWidth = contentWidth;
			const imgHeight = (imgWidth * 0.6); // Maintain aspect ratio
			doc.addImage(chartImages.trendChart, 'PNG', margin, yPos, imgWidth, imgHeight);
			yPos += imgHeight + 10;
		} catch (error) {
			console.error('Error adding trend chart:', error);
			doc.text('ไม่สามารถแสดงกราฟแนวโน้มได้', margin, yPos);
			yPos += 10;
		}
	}

	// Check if we need a new page
	if (yPos > pageHeight - 80) {
		doc.addPage();
		yPos = margin;
	}

	// Section 2: Gender Chart (Left) + Gender Table (Right)
	doc.setFontSize(12);
	doc.text('สัดส่วนเพศ', margin, yPos);
	yPos += 8;

	const section2Width = contentWidth / 2 - 5;
	
	// Gender Chart (Left)
	if (chartImages?.genderChart) {
		try {
			const imgSize = Math.min(section2Width, 60);
			doc.addImage(chartImages.genderChart, 'PNG', margin, yPos, imgSize, imgSize);
		} catch (error) {
			console.error('Error adding gender chart:', error);
		}
	}

	// Gender Table (Right)
	const genderTableX = margin + section2Width + 10;
	autoTable(doc, {
		startY: yPos,
		head: [['เพศ', 'จำนวน', 'ร้อยละ']],
		body: [
			['ชาย', data.genderStats.MALE.count.toLocaleString('th-TH'), data.genderStats.MALE.percentage + '%'],
			['หญิง', data.genderStats.FEMALE.count.toLocaleString('th-TH'), data.genderStats.FEMALE.percentage + '%'],
			['อัตราส่วน (หญิง:ชาย)', `หญิง 1 : ชาย ${data.genderStats.ratio}`, '']
		],
		theme: 'striped',
		headStyles: { fillColor: [45, 122, 50], textColor: 255, font: 'THSarabunNew', fontSize: 11 },
		bodyStyles: { font: 'THSarabunNew', fontSize: 10 },
		margin: { left: genderTableX, right: margin },
		styles: { cellPadding: 3 }
	});

	yPos = (doc as any).lastAutoTable.finalY + 10;

	// Check if we need a new page
	if (yPos > pageHeight - 80) {
		doc.addPage();
		yPos = margin;
	}

	// Section 3: Top Occupations Table (Right) + Chart (Left)
	doc.setFontSize(12);
	doc.text('อาชีพ', margin, yPos);
	yPos += 8;

	// Occupation Chart (Left)
	if (chartImages?.occupationChart) {
		try {
			const imgWidth = section2Width;
			const imgHeight = Math.min(imgWidth * 0.8, 80);
			doc.addImage(chartImages.occupationChart, 'PNG', margin, yPos, imgWidth, imgHeight);
		} catch (error) {
			console.error('Error adding occupation chart:', error);
		}
	}

	// Top Occupations Table (Right)
	const topOccupations = data.occupations.slice(0, 10); // Top 10
	autoTable(doc, {
		startY: yPos,
		head: [['อาชีพ', 'จำนวน', 'ร้อยละ']],
		body: topOccupations.map(occ => [
			occ.name,
			occ.count.toString(),
			occ.percentage + '%'
		]),
		theme: 'striped',
		headStyles: { fillColor: [76, 175, 80], textColor: 255, font: 'THSarabunNew', fontSize: 11 },
		bodyStyles: { font: 'THSarabunNew', fontSize: 10 },
		margin: { left: genderTableX, right: margin },
		styles: { cellPadding: 3 }
	});

	yPos = (doc as any).lastAutoTable.finalY + 10;

	// Check if we need a new page
	if (yPos > pageHeight - 80) {
		doc.addPage();
		yPos = margin;
	}

	// Section 4: Age Group Table (Striped theme)
	doc.setFontSize(12);
	doc.text('สถิติตามกลุ่มอายุ', margin, yPos);
	yPos += 8;

	const totalDied = data.ageStats.reduce((sum, a) => sum + a.died, 0);
	const totalDeathRate = data.stats.totalCases > 0 
		? ((totalDied / data.stats.totalCases) * 100).toFixed(2)
		: '0.00';

	autoTable(doc, {
		startY: yPos,
		head: [['กลุ่มอายุ', 'จำนวนผู้ป่วย', 'อัตราป่วย (/100,000)', 'จำนวนเสียชีวิต', 'อัตราป่วยเสียชีวิต (%)']],
		body: [
			...data.ageStats.map(age => [
				age.ageGroup,
				age.count.toString(),
				age.morbidityRate,
				age.died.toString(),
				age.deathRate + '%'
			]),
			[
				'รวม',
				data.stats.totalCases.toString(),
				data.stats.incidenceRate,
				totalDied.toString(),
				totalDeathRate + '%'
			]
		],
		theme: 'striped',
		headStyles: { fillColor: [45, 122, 50], textColor: 255, font: 'THSarabunNew', fontSize: 11 },
		bodyStyles: { font: 'THSarabunNew', fontSize: 10 },
		margin: { left: margin, right: margin },
		styles: { cellPadding: 3 },
		footStyles: { font: 'THSarabunNew', fontSize: 10, fontStyle: 'bold' }
	});

	yPos = (doc as any).lastAutoTable.finalY + 10;

	// Check if we need a new page
	if (yPos > pageHeight - 80) {
		doc.addPage();
		yPos = margin;
	}

	// Section 5: 5-Year Historical Data Table
	doc.setFontSize(12);
	doc.text('สถานการณ์โรคย้อนหลัง 5 ปี', margin, yPos);
	yPos += 8;

	autoTable(doc, {
		startY: yPos,
		head: [['ปี', 'จำนวนป่วย', 'อัตราป่วย (/100,000)', 'จำนวนเสียชีวิต', 'อัตราเสียชีวิต (%)']],
		body: data.historicalData.map(hist => [
			(hist.year + 543).toString(),
			hist.totalCases.toString(),
			hist.morbidityRate,
			hist.died.toString(),
			hist.deathRate + '%'
		]),
		theme: 'striped',
		headStyles: { fillColor: [129, 199, 132], textColor: 0, font: 'THSarabunNew', fontSize: 11 },
		bodyStyles: { font: 'THSarabunNew', fontSize: 10 },
		margin: { left: margin, right: margin },
		styles: { cellPadding: 3 }
	});

	// Footer
	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(128, 128, 128);
		doc.text(
			`หน้า ${i} จาก ${totalPages}`,
			pageWidth / 2,
			pageHeight - 10,
			{ align: 'center' }
		);
	}

	if (action === 'preview') {
		// Generate blob and create object URL for preview
		const blob = doc.output('blob');
		const url = URL.createObjectURL(blob);
		return url;
	} else {
		const fileName = `รายงานสถานการณ์โรค_${data.diseaseName}_${data.year + 543}.pdf`;
		doc.save(fileName);
	}
};
