# Migration Guide: v1.5 → v2.0

Guide for migrating data from VBD-DB v1.5 to v2.0

## 🔄 Major Changes

### Schema Changes

#### 1. Patient-Visit Separation
**v1.5:** Combined patient and visit data in single record  
**v2.0:** Normalized structure:
- `Patient` table: Profile information
- `CaseReport` table: Individual visits/cases

#### 2. Field Mapping

| v1.5 Field | v2.0 Field | Notes |
|------------|------------|-------|
| `idCardCode` | `Patient.idCard` | Moved to Patient |
| `fname` | `Patient.firstName` | Moved to Patient |
| `lname` | `Patient.lastName` | Moved to Patient |
| `currentHouseNumber` | `Patient.addressNo` | Permanent address |
| `currentVillageNumber` | `Patient.moo` | Permanent address |
| `currentRoadName` | `Patient.road` | Permanent address |
| `hospitalCode9Digit` | `Hospital.code9` | Renamed |
| `illnessDate` | `CaseReport.illnessDate` | Moved to CaseReport |
| `treatmentDate` | `CaseReport.treatDate` | Renamed |

#### 3. Enum to MasterData
**v1.5:** Hard-coded enums  
**v2.0:** Flexible `MasterData` table

```sql
-- v1.5
prefix ENUM('นาย', 'นาง', 'นางสาว')

-- v2.0
MasterData WHERE category = 'PREFIX'
```

#### 4. Geography Structure
**v1.5:** Flat structure  
**v2.0:** Relational structure with IDs

```sql
-- v2.0
Province (id, code, nameTh)
  → Amphoe (id, code, nameTh, provinceId)
    → Tambon (id, code, nameTh, amphoeId)
```

## 📊 Migration Script Example

### 1. Export v1.5 Data

```javascript
// export-v1.js
const oldDb = require('./old-db-connection');

async function exportData() {
  const records = await oldDb.query(`
    SELECT * FROM case_reports
    ORDER BY created_at
  `);
  
  fs.writeFileSync('v1-export.json', JSON.stringify(records, null, 2));
}

exportData();
```

### 2. Transform Data

```javascript
// transform.js
const v1Data = require('./v1-export.json');

function transformRecord(oldRecord) {
  // Extract patient data
  const patient = {
    idCard: oldRecord.idCardCode,
    prefix: oldRecord.prefix,
    firstName: oldRecord.fname,
    lastName: oldRecord.lname,
    gender: oldRecord.gender,
    birthDate: oldRecord.birthDate,
    nationality: oldRecord.nationality || 'ไทย',
    maritalStatus: oldRecord.maritalStatus,
    occupation: oldRecord.occupation,
    phone: oldRecord.phone,
    addressNo: oldRecord.currentHouseNumber,
    moo: oldRecord.currentVillageNumber,
    road: oldRecord.currentRoadName,
    provinceId: mapProvinceCode(oldRecord.province),
    amphoeId: mapAmphoeCode(oldRecord.amphoe),
    tambonId: mapTambonCode(oldRecord.tambon)
  };

  // Extract case report data
  const caseReport = {
    hospitalId: mapHospitalCode(oldRecord.hospitalCode9Digit),
    diseaseId: mapDiseaseCode(oldRecord.diseaseCode),
    illnessDate: oldRecord.illnessDate,
    treatDate: oldRecord.treatmentDate,
    diagnosisDate: oldRecord.diagnosisDate,
    patientType: oldRecord.patientType,
    condition: oldRecord.condition,
    deathDate: oldRecord.deathDate,
    causeOfDeath: oldRecord.causeOfDeath,
    ageYears: calculateAge(oldRecord.birthDate, oldRecord.illnessDate),
    // Sick address (might be same as home address)
    sickAddressNo: oldRecord.sickHouseNumber || oldRecord.currentHouseNumber,
    sickMoo: oldRecord.sickVillageNumber || oldRecord.currentVillageNumber,
    sickRoad: oldRecord.sickRoadName || oldRecord.currentRoadName,
    sickProvinceId: mapProvinceCode(oldRecord.sickProvince || oldRecord.province),
    sickAmphoeId: mapAmphoeCode(oldRecord.sickAmphoe || oldRecord.amphoe),
    sickTambonId: mapTambonCode(oldRecord.sickTambon || oldRecord.tambon),
    reporterName: oldRecord.reporterName,
    remark: oldRecord.remark
  };

  return { patient, caseReport };
}

// Helper functions
function mapProvinceCode(oldCode) {
  // Map old province code to new ID
  const mapping = {
    '10': 10,
    '50': 50,
    // ... add all mappings
  };
  return mapping[oldCode];
}

function mapHospitalCode(code9) {
  // Query new database for hospital ID by code9
  return hospitalIdFromCode9[code9];
}

function mapDiseaseCode(oldCode) {
  // Map ICD-10 code to disease ID
  return diseaseIdFromCode[oldCode];
}

function calculateAge(birthDate, illnessDate) {
  const birth = new Date(birthDate);
  const illness = new Date(illnessDate);
  const diff = illness - birth;
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

const transformed = v1Data.map(transformRecord);
fs.writeFileSync('v2-import.json', JSON.stringify(transformed, null, 2));
```

### 3. Import to v2.0

```javascript
// import-v2.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const importData = require('./v2-import.json');

async function importRecords() {
  for (const record of importData) {
    try {
      // Check if patient exists
      let patient = null;
      if (record.patient.idCard) {
        patient = await prisma.patient.findUnique({
          where: { idCard: record.patient.idCard }
        });
      }

      // Create or update patient
      if (patient) {
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: record.patient
        });
      } else {
        patient = await prisma.patient.create({
          data: record.patient
        });
      }

      // Create case report
      await prisma.caseReport.create({
        data: {
          ...record.caseReport,
          patientId: patient.id
        }
      });

      console.log(`✓ Imported: ${patient.firstName} ${patient.lastName}`);
    } catch (error) {
      console.error(`✗ Failed to import:`, error.message);
    }
  }

  console.log('Migration completed!');
}

importRecords();
```

## 🔍 Data Validation

### Pre-Migration Checks

```sql
-- Check for duplicate ID cards
SELECT idCard, COUNT(*) 
FROM patients 
GROUP BY idCard 
HAVING COUNT(*) > 1;

-- Check for missing required fields
SELECT * FROM patients WHERE firstName IS NULL OR lastName IS NULL;

-- Check for invalid dates
SELECT * FROM case_reports WHERE illnessDate > CURRENT_DATE;
```

### Post-Migration Verification

```sql
-- Verify record counts
SELECT 
  (SELECT COUNT(*) FROM Patient) as total_patients,
  (SELECT COUNT(*) FROM CaseReport) as total_cases;

-- Verify relationships
SELECT COUNT(*) 
FROM CaseReport cr
LEFT JOIN Patient p ON cr.patientId = p.id
WHERE p.id IS NULL;

-- Check age calculations
SELECT * FROM CaseReport WHERE ageYears < 0 OR ageYears > 150;
```

## ⚠️ Common Issues

### Issue 1: Duplicate Patients
**Problem:** Same person with multiple ID cards  
**Solution:** Manual de-duplication before migration

```sql
-- Find potential duplicates
SELECT firstName, lastName, birthDate, COUNT(*) 
FROM staging_patients
GROUP BY firstName, lastName, birthDate
HAVING COUNT(*) > 1;
```

### Issue 2: Invalid Geography Codes
**Problem:** Old codes don't match new structure  
**Solution:** Create mapping table

```javascript
const geoMapping = {
  'OLD_PROVINCE_CODE': { newId: 10, name: 'กรุงเทพมหานคร' },
  // ...
};
```

### Issue 3: Null Birth Dates
**Problem:** Age calculation requires birthDate  
**Solution:** Use illnessDate and estimated age

```javascript
if (!birthDate && estimatedAge) {
  birthDate = new Date(illnessDate);
  birthDate.setFullYear(birthDate.getFullYear() - estimatedAge);
}
```

## 🧪 Testing Migration

### Test Environment Setup

```bash
# Create test database
docker-compose -f docker-compose.test.yml up -d

# Run migration on test data
DATABASE_URL="postgresql://test:test@localhost:5433/test_vbddb" \
  node import-v2.js --dry-run

# Verify results
npm run db:studio
```

### Rollback Plan

```bash
# Backup before migration
pg_dump vbddb > backup_before_migration.sql

# Rollback if needed
psql vbddb < backup_before_migration.sql
```

## 📝 Checklist

- [ ] Export all v1.5 data
- [ ] Create mapping tables (provinces, hospitals, diseases)
- [ ] Test migration script on sample data
- [ ] Backup production database
- [ ] Run full migration
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Train users on new features
- [ ] Document custom changes

## 📞 Support

For migration assistance:
- Check logs: `docker-compose logs`
- Review Prisma Studio: `npm run db:studio`
- Contact development team

---

**Important:** Always backup before migration!









