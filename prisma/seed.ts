import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding/updating data...');

  // 1. Update Hospitals
  console.log('Updating Hospitals...');
  const hospitals = [
    { name: 'สำนักงานสาธารณสุขอำเภอวิเชียรบุรี', code9New: 'BA0000712', code9: '000071200', code5: '00712', orgType: 'รัฐบาล', healthServiceType: 'สำนักงานสาธารณสุขอำเภอ', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลวิเชียรบุรี', code9New: 'EA0011266', code9: '001126600', code5: '11266', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลทั่วไป', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลนาไร่เดียว ตำบลท่าโรง', code9New: 'GA0007787', code9: '000778700', code5: '07787', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลท่าโรง ตำบลท่าโรง', code9New: 'GA0007788', code9: '000778800', code5: '07788', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลแก่งหินปูน ตำบลสามแยก', code9New: 'GA0007789', code9: '000778900', code5: '07789', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลโคกปรง ตำบลโคกปรง', code9New: 'GA0007790', code9: '000779000', code5: '07790', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลน้ำร้อน ตำบลน้ำร้อน', code9New: 'GA0007791', code9: '000779100', code5: '07791', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลบ่อรัง ตำบลบ่อรัง', code9New: 'GA0007792', code9: '000779200', code5: '07792', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลวังไผ่ ตำบลบ่อรัง', code9New: 'GA0007793', code9: '000779300', code5: '07793', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลพุเตย ตำบลพุเตย', code9New: 'GA0007794', code9: '000779400', code5: '07794', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลพุขาม ตำบลพุขาม', code9New: 'GA0007795', code9: '000779500', code5: '07795', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลรวมทรัพย์ ตำบลภูน้ำหยด', code9New: 'GA0007796', code9: '000779600', code5: '07796', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลยางจ่า ตำบลภูน้ำหยด', code9New: 'GA0007797', code9: '000779700', code5: '07797', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลโพทะเล ตำบลซับสมบูรณ์', code9New: 'GA0007798', code9: '000779800', code5: '07798', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลบึงกระจับ ตำบลบึงกระจับ', code9New: 'GA0007799', code9: '000779900', code5: '07799', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลวังใหญ่ ตำบลวังใหญ่', code9New: 'GA0007800', code9: '000780000', code5: '07800', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลโนนสง่า ตำบลยางสาว', code9New: 'GA0007801', code9: '000780100', code5: '07801', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลซับน้อย ตำบลซับน้อย', code9New: 'GA0007802', code9: '000780200', code5: '07802', orgType: 'รัฐบาล', healthServiceType: 'โรงพยาบาลส่งเสริมสุขภาพตำบล', affiliation: 'กระทรวงสาธารณสุข', department: 'สำนักงานปลัดกระทรวงสาธารณสุข' },
    { name: 'โรงพยาบาลส่งเสริมสุขภาพตำบลวังวัด ตำบลยางสาว', code9New: 'GA0014069', code9: '001406900', code5: '14069', orgType: 'รัฐบาล', healthServiceType: 'ศูนย์บริการสาธารณสุข อปท.', affiliation: 'องค์กรปกครองส่วนท้องถิ่น', department: '-' }
  ];

  for (const h of hospitals) {
    // Try to find by code9New first, then by code9 (legacy)
    const existing = await prisma.hospital.findFirst({
      where: {
        OR: [
          { code9New: h.code9New },
          { code9: h.code9 }
        ]
      }
    });

    if (existing) {
      await prisma.hospital.update({
        where: { id: existing.id },
        data: {
          name: h.name,
          code9New: h.code9New,
          code9: h.code9,
          code5: h.code5,
          orgType: h.orgType,
          healthServiceType: h.healthServiceType,
          affiliation: h.affiliation,
          department: h.department
        }
      });
    } else {
      await prisma.hospital.create({
        data: {
          name: h.name,
          code9New: h.code9New,
          code9: h.code9,
          code5: h.code5,
          orgType: h.orgType,
          healthServiceType: h.healthServiceType,
          affiliation: h.affiliation,
          department: h.department
        }
      });
    }
  }

  // 2. Update Occupations
  console.log('Updating Occupations...');
  const occupations = [
    'นักเรียน', 'นักศึกษา', 'ในปกครอง', 'รับราชการ', 'รัฐวิสาหกิจ',
    'รับจ้างทั่วไป', 'ธุรกิจส่วนตัว', 'เกษตรกร', 'พนักงานภาครัฐ',
    'พนักงานเอกชน', 'แม่บ้าน/พ่อบ้าน', 'นักบวช/สมณะ', 'ค้าขาย',
    'ไม่มีอาชีพ', 'อื่นๆ'
  ];

  for (const occ of occupations) {
    await prisma.masterData.upsert({
      where: { category_value: { category: 'OCCUPATION', value: occ } },
      update: {},
      create: { category: 'OCCUPATION', value: occ }
    });
  }

  // 3. Update Province (Phetchabun)
  console.log('Updating Province: Phetchabun...');
  const phetchabun = await prisma.province.upsert({
    where: { id: 67 }, // รหัสจังหวัดเพชรบูรณ์คือ 67
    update: { nameTh: 'เพชรบูรณ์', code: '67' },
    create: { id: 67, code: '67', nameTh: 'เพชรบูรณ์' }
  });

  // 4. Add Amphoes (Districts) for Phetchabun
  console.log('Adding Amphoes for Phetchabun...');
  const amphoes = [
    { id: 6701, code: '6701', nameTh: 'เมืองเพชรบูรณ์', provinceId: 67 },
    { id: 6702, code: '6702', nameTh: 'ชนแดน', provinceId: 67 },
    { id: 6703, code: '6703', nameTh: 'หล่มสัก', provinceId: 67 },
    { id: 6704, code: '6704', nameTh: 'หล่มเก่า', provinceId: 67 },
    { id: 6705, code: '6705', nameTh: 'วิเชียรบุรี', provinceId: 67 },
    { id: 6706, code: '6706', nameTh: 'ศรีเทพ', provinceId: 67 },
    { id: 6707, code: '6707', nameTh: 'หนองไผ่', provinceId: 67 },
    { id: 6708, code: '6708', nameTh: 'บึงสามพัน', provinceId: 67 },
    { id: 6709, code: '6709', nameTh: 'น้ำหนาว', provinceId: 67 },
    { id: 6710, code: '6710', nameTh: 'วังโป่ง', provinceId: 67 },
    { id: 6711, code: '6711', nameTh: 'เขาค้อ', provinceId: 67 }
  ];

  for (const amphoe of amphoes) {
    await prisma.amphoe.upsert({
      where: { id: amphoe.id },
      update: { nameTh: amphoe.nameTh, code: amphoe.code },
      create: amphoe
    });
  }

  // 5. Add Tambons (Sub-districts) for Phetchabun - Based on hospital names
  console.log('Adding Tambons for Phetchabun...');
  const tambons = [
    // อำเภอวิเชียรบุรี (6705)
    { id: 670501, code: '670501', nameTh: 'ท่าโรง', amphoeId: 6705 },
    { id: 670502, code: '670502', nameTh: 'สามแยก', amphoeId: 6705 },
    { id: 670503, code: '670503', nameTh: 'โคกปรง', amphoeId: 6705 },
    { id: 670504, code: '670504', nameTh: 'น้ำร้อน', amphoeId: 6705 },
    { id: 670505, code: '670505', nameTh: 'บ่อรัง', amphoeId: 6705 },
    { id: 670506, code: '670506', nameTh: 'พุเตย', amphoeId: 6705 },
    { id: 670507, code: '670507', nameTh: 'พุขาม', amphoeId: 6705 },
    { id: 670508, code: '670508', nameTh: 'ภูน้ำหยด', amphoeId: 6705 },
    { id: 670509, code: '670509', nameTh: 'ซับสมบูรณ์', amphoeId: 6705 },
    { id: 670510, code: '670510', nameTh: 'บึงกระจับ', amphoeId: 6705 },
    { id: 670511, code: '670511', nameTh: 'วังใหญ่', amphoeId: 6705 },
    { id: 670512, code: '670512', nameTh: 'ยางสาว', amphoeId: 6705 },
    { id: 670513, code: '670513', nameTh: 'ซับน้อย', amphoeId: 6705 },
    // อำเภอเมืองเพชรบูรณ์ (6701) - เพิ่มตัวอย่าง
    { id: 670101, code: '670101', nameTh: 'ในเมือง', amphoeId: 6701 },
    { id: 670102, code: '670102', nameTh: 'ตะเบาะ', amphoeId: 6701 },
    { id: 670103, code: '670103', nameTh: 'บ้านโตก', amphoeId: 6701 }
  ];

  for (const tambon of tambons) {
    await prisma.tambon.upsert({
      where: { id: tambon.id },
      update: { nameTh: tambon.nameTh, code: tambon.code },
      create: tambon
    });
  }

  // Create default admin if not exists
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const superadmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash,
      fullName: 'Super Admin',
      role: 'SUPERADMIN'
    }
  });

  console.log('Seeding completed.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
