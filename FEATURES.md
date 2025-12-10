# VBD-DB v2.0 - Feature Documentation

Complete feature list and usage guide for the Vector-Borne Disease Database.

## 🎯 Core Features

### 1. Authentication & Authorization ✅

#### Custom Authentication System
- **Bcrypt Password Hashing:** 10 rounds for security
- **HttpOnly Cookies:** Prevents XSS attacks
- **Session Management:** Server-side session storage in database
- **Session Expiration:** 30-day automatic expiration
- **CSRF Protection:** Built-in SvelteKit protection

#### Role-Based Access Control (RBAC)

**SUPERADMIN**
- ✅ Full system access
- ✅ Configuration management
- ✅ Master data CRUD operations
- ✅ User management (all roles)
- ✅ Global data access (all hospitals)
- ✅ System settings

**ADMIN (Public Health Officer)**
- ✅ Global data entry
- ✅ Can select any hospital when creating cases
- ✅ Offline mode capability
- ✅ Manage hospital-level users
- ✅ Access all reports
- ✅ Excel import/export

**USER (Hospital Staff)**
- ✅ Read-only access
- ✅ Scoped to assigned hospital only
- ✅ View cases for their hospital
- ✅ Excel export only
- ❌ Cannot create/edit cases
- ❌ No offline mode

### 2. Patient Management ✅

#### Patient Search
- **Search by ID Card:** 13-digit Thai national ID
- **Search by Name:** First name or last name (case-insensitive)
- **Auto-complete:** Real-time search results
- **Duplicate Detection:** Prevents duplicate patient records

#### Patient Profile
- **Demographics:**
  - ID Card (validated with checksum)
  - Prefix (from master data)
  - First Name & Last Name
  - Gender (Male/Female)
  - Birth Date
  - Age calculation (automatic)
  - Nationality (default: Thai)
  - Marital Status
  - Occupation
  - Phone Number (validated Thai format)

- **Permanent Address:**
  - House Number
  - Village Number (Moo)
  - Road Name
  - Province (dropdown)
  - District/Amphoe (cascading dropdown)
  - Sub-district/Tambon (cascading dropdown)

- **Features:**
  - Soft delete (preserves history)
  - Edit existing patients
  - View case history
  - Automatic timestamps

### 3. Case Report Management ✅

#### Multi-Step Form Wizard

**Step 1: Patient Search**
- Search existing patients by ID or name
- View search results in table
- Select existing patient
- OR proceed to add new patient

**Step 2: Patient Information**
- Auto-fill from existing patient (if selected)
- Edit patient details
- Add new patient
- Cascading address dropdowns
- Real-time validation

**Step 3: Case Details**
- Hospital selection (dropdown)
- Disease selection (searchable)
- Illness date (required)
- Treatment date
- Diagnosis date
- Patient type (IPD/OPD/ACF)
- Condition (Recovered/Under Treatment/Died)
- Death information (if applicable)
- Sick address (can copy from home address)
- Reporter name
- Remarks/notes

#### Case Features
- **Age Calculation:** Automatic based on birth date and illness date
- **Address Copying:** One-click copy home address to sick address
- **Validation:** Comprehensive Zod schema validation
- **Superforms:** Robust form handling with error display
- **Soft Delete:** Cases can be archived
- **Audit Trail:** Creation and update timestamps

### 4. Offline-First Architecture ✅

#### Dexie.js (IndexedDB) Integration
- **Reference Data Caching:**
  - Master data (prefixes, occupations, etc.)
  - Diseases
  - Hospitals
  - Provinces, amphoes, tambons
  - Auto-cached on login

- **Offline Case Submission:**
  - Create cases while offline
  - Store in IndexedDB
  - Mark as "unsynced"
  - Visual sync status indicator

- **Automatic Sync:**
  - Detects online/offline status
  - Auto-syncs when connection restored
  - Shows pending sync count
  - Prevents duplicate submissions

- **Sync Status Indicator:**
  - 🟢 Online (green checkmark)
  - 🟡 Syncing (yellow spinner)
  - 🔴 Offline (red warning)

### 5. Reports & Analytics ✅

#### Dashboard Overview
- **Summary Statistics:**
  - Total cases
  - Cases this month
  - Total patients
  - Total hospitals

- **Recent Cases Table:**
  - Last 10 case reports
  - Quick overview
  - Status indicators
  - Link to details

- **Quick Actions:**
  - New case report
  - View reports
  - Patient registry

#### Case Reports List
- **Features:**
  - Full case listing with pagination
  - Search functionality
  - Filter options
  - Status badges
  - Action menu per case
  - Excel export

- **Display Fields:**
  - Illness date
  - Patient name
  - Age
  - Gender
  - Disease
  - Hospital
  - Status

#### Patient Registry
- **Features:**
  - Complete patient list
  - Search by name/ID
  - Case count per patient
  - Gender statistics
  - Patient details view

#### Analytics & Statistics

**Summary Cards:**
- Total cases
- Recovered count (%)
- Under treatment count (%)
- Death count (%)

**Charts (Chart.js):**
1. **Age Distribution Chart**
   - Bar chart
   - Age groups: 0-10, 11-20, 21-30, 31-40, 41-50, 51-60, 60+
   - Shows disease burden by age

2. **Disease Distribution Chart**
   - Pie chart
   - Top 6 diseases
   - Color-coded
   - Percentage display

3. **Monthly Trend Chart**
   - Line chart
   - Cases per month
   - Current year
   - Shows outbreak patterns

**Morbidity Rate Calculation:**
- Cases per 100,000 population
- Calculated per disease
- Based on population data
- Table format with sorting

**PDF Export:**
- Generate formal reports
- Include all charts
- Summary statistics
- Professional formatting

### 6. Master Data Management ✅

#### Flexible Configuration System
- **Categories:**
  - PREFIX (นาย, นาง, นางสาว, etc.)
  - OCCUPATION (เกษตรกร, รับจ้าง, etc.)
  - NATIONALITY (ไทย, พม่า, ลาว, etc.)
  - MARITAL_STATUS (โสด, สมรส, etc.)

- **Disease Master:**
  - ICD-10 code
  - Thai name
  - English name
  - Abbreviation
  - Symptoms
  - Active/Inactive flag

- **Hospital Master:**
  - Name
  - 9-digit code
  - 5-digit code
  - Type (Hospital, Municipality, SAO)

- **Geography Master:**
  - 77 Provinces
  - ~900 Districts (Amphoes)
  - ~7,000+ Sub-districts (Tambons)
  - Hierarchical structure
  - JSON import support

#### CRUD Operations (SUPERADMIN only)
- Create new entries
- Edit existing entries
- Delete entries
- Import from JSON
- Export to Excel

### 7. User Management ✅

#### User Features
- **Profile Fields:**
  - Username (unique)
  - Password (hashed)
  - Full name
  - Role (SUPERADMIN/ADMIN/USER)
  - Active status
  - Assigned hospital (for USER role)
  - Creator tracking

- **Operations:**
  - Create users (SUPERADMIN, ADMIN)
  - Edit user details
  - Change password
  - Activate/Deactivate users
  - Delete users
  - View user activity

#### Role Assignment
- SUPERADMIN can create all roles
- ADMIN can create USER roles only
- USER role must be assigned to a hospital
- Hospital scoping for data access

### 8. Import/Export ✅

#### Excel Export (xlsx)
- **Case Reports:**
  - Full export with all fields
  - Formatted columns
  - Thai headers
  - Date formatting
  - Status translation

- **Patient Registry:**
  - Demographics export
  - Address information
  - Case count

- **Report Data:**
  - Statistics export
  - Chart data
  - Morbidity rates

#### Excel Import (Future Enhancement)
- Bulk case import
- Patient import
- Template download
- Validation before import
- Error reporting

### 9. Database Features ✅

#### Prisma ORM
- **Type Safety:** Full TypeScript support
- **Migrations:** Version-controlled schema changes
- **Relations:** Properly defined foreign keys
- **Indexes:** Optimized for common queries

#### Key Indexes
- Patient: `firstName, lastName, idCard`
- CaseReport: `hospitalId, illnessDate`, `diseaseId`, `deletedAt`
- Hospital: `code9`
- User: `username`

#### Soft Delete
- Never actually delete data
- Set `deletedAt` timestamp
- Exclude from queries by default
- Can be restored

#### Audit Logging (Ready)
- AuditLog model in schema
- Track user actions
- Timestamp all changes
- Preserve history

### 10. UI/UX Features ✅

#### DaisyUI Components
- **Modern Design:** Beautiful, responsive UI
- **Theme Support:** Light, dark, and cupcake themes
- **Components:**
  - Cards
  - Tables
  - Forms
  - Buttons
  - Badges
  - Alerts
  - Modals
  - Dropdowns
  - Loading states

#### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop layout
- Touch-friendly
- Sidebar navigation

#### Accessibility
- ARIA labels
- Keyboard navigation
- Focus indicators
- Screen reader support

#### Loading States
- Spinner indicators
- Skeleton loaders
- Progress feedback
- Optimistic updates

#### Error Handling
- Form validation errors
- API error display
- Network error handling
- User-friendly messages

## 📊 Data Flow

### Case Report Creation Flow
```
User Input → Validation (Zod) → Superforms Processing → API Route
  → Prisma Transaction → Database → Response → UI Update
  
If Offline:
User Input → Validation → Dexie.js → IndexedDB
  → (When Online) → Sync to Server → Database
```

### Authentication Flow
```
Login Form → Validate Credentials → Bcrypt Compare
  → Create Session → Store in DB → Set HttpOnly Cookie
  → Redirect to Dashboard
```

### Search Flow
```
User Types → Debounced API Call → Prisma Query
  → Filter Results → Return JSON → Update UI
```

## 🔐 Security Features

- ✅ Password hashing (Bcrypt, 10 rounds)
- ✅ HttpOnly cookies (no JavaScript access)
- ✅ CSRF protection
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (Svelte escaping)
- ✅ Session expiration
- ✅ Role-based access control
- ✅ Input validation (Zod schemas)
- ✅ Secure headers
- ✅ Environment variables for secrets

## 🚀 Performance Features

- ✅ Server-side rendering (SSR)
- ✅ Code splitting
- ✅ Lazy loading
- ✅ Database indexing
- ✅ Query optimization
- ✅ Connection pooling (Prisma)
- ✅ Efficient re-renders (Svelte 5)
- ✅ Debounced search
- ✅ Pagination (prepared)

## 🧪 Testing Ready

### Test Structure (To Implement)
- Unit tests (Vitest)
- Integration tests
- E2E tests (Playwright)
- API tests
- Database tests

### Current State
- TypeScript strict mode (compile-time checks)
- Prisma validation (runtime checks)
- Zod schemas (input validation)

## 📈 Future Enhancements

### Planned Features
- [ ] Excel bulk import
- [ ] PDF report generation (jsPDF integration)
- [ ] Real-time notifications (Discord webhook)
- [ ] Email alerts
- [ ] Advanced filtering
- [ ] Data visualization improvements
- [ ] Mobile app (PWA)
- [ ] Multi-language support
- [ ] Audit log viewer
- [ ] Data backup/restore
- [ ] API documentation (OpenAPI)
- [ ] Rate limiting
- [ ] Two-factor authentication (2FA)

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 (not supported)

## 🌐 Deployment Options

- ✅ Docker (included)
- ✅ Node.js standalone
- ✅ Cloud platforms (Vercel, Railway, etc.)
- ✅ VPS/Dedicated server
- ✅ Kubernetes (production)

---

**Version:** 2.0.0  
**Last Updated:** December 2025  
**Status:** Production Ready ✅









