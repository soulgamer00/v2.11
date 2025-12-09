# VBD-DB v2.0 - Vector-Borne Disease Database

ระบบฐานข้อมูลโรคติดต่อนำโดยแมลง (Vector-Borne Disease Database) เวอร์ชัน 2.0

## 🚀 Tech Stack

- **Framework:** SvelteKit with Node.js Adapter
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL 16 (Docker)
- **ORM:** Prisma
- **Authentication:** Custom Auth (Bcrypt + HttpOnly Cookies + Session Table)
- **Offline Engine:** Dexie.js (IndexedDB)
- **Reporting:** Chart.js + jsPDF
- **Import/Export:** xlsx (SheetJS)
- **UI:** Tailwind CSS + DaisyUI

## 📋 Features

### Core Features
- ✅ **Custom Authentication System** - Secure login with role-based access control
- ✅ **Patient Management** - Complete patient profile management
- ✅ **Case Reporting** - Multi-step form with validation
- ✅ **Offline-First** - Work offline with Dexie.js and auto-sync
- ✅ **Reports & Analytics** - Charts, statistics, and PDF export
- ✅ **Excel Import/Export** - Bulk data operations
- ✅ **Master Data Management** - Flexible configuration system

### Access Control
- **SUPERADMIN:** Full system access, configuration, and user management
- **ADMIN:** Global data entry, offline mode, and hospital user management
- **USER:** Read-only access scoped to assigned hospital with Excel export

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- Docker & Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd webreport-v2.1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
# Copy the example env file
copy .env.example .env
```

Edit `.env` and configure:
```env
DATABASE_URL="postgresql://vbduser:vbdpassword@localhost:5432/vbddb?schema=public"
SESSION_SECRET="your-super-secret-session-key-change-this"
ORIGIN="http://localhost:5173"
```

### 4. Start PostgreSQL Database
```bash
docker-compose up -d
```

Verify the database is running:
```bash
docker ps
```

### 5. Initialize Database
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with initial data
npm run db:seed
```

### 6. Start Development Server
```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

## 🔑 Default Login Credentials

After seeding, you can login with:

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `admin123` | SUPERADMIN |
| `admin` | `admin123` | ADMIN |
| `user` | `admin123` | USER |

⚠️ **IMPORTANT:** Change these passwords in production!

## 📊 Database Schema

### Core Models
- **User** - Authentication and user management
- **Session** - Secure session storage
- **Hospital** - Healthcare facilities
- **Patient** - Patient profiles (normalized)
- **CaseReport** - Disease case reports (transactions)
- **Disease** - Disease master data
- **MasterData** - Flexible configuration (Prefix, Occupation, etc.)
- **Province/Amphoe/Tambon** - Thai geography data

### Key Features
- Normalized structure separating Patient from Visit
- Soft delete support (`deletedAt`)
- Audit logging capability
- Flexible master data system (no hard-coded enums)

## 🗺️ Thai Geography Data

To load complete Thai geography data:

1. Create `prisma/thai-geo.json` with structure:
```json
{
  "provinces": [
    {
      "id": 10,
      "code": "10",
      "nameTh": "กรุงเทพมหานคร",
      "amphoes": [
        {
          "id": 1001,
          "code": "1001",
          "nameTh": "เขตพระนคร",
          "tambons": [...]
        }
      ]
    }
  ]
}
```

2. Run seed again:
```bash
npm run db:seed
```

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes
npm run db:migrate       # Create migration
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio

# Type Checking
npm run check            # Run svelte-check
npm run check:watch      # Run in watch mode
```

## 🏗️ Project Structure

```
webreport-v2.1/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Seed script
│   └── thai-geo.json           # Thai geography data (optional)
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth.ts         # Authentication logic
│   │   │   └── db.ts           # Prisma client
│   │   ├── db/
│   │   │   └── offline.ts      # Dexie.js offline database
│   │   ├── stores/
│   │   │   ├── user.ts         # User store
│   │   │   └── offline.ts      # Offline sync store
│   │   ├── schemas/
│   │   │   └── case.ts         # Zod validation schemas
│   │   └── utils/
│   │       ├── date.ts         # Date utilities
│   │       └── validation.ts   # Validation helpers
│   ├── routes/
│   │   ├── api/                # API endpoints
│   │   ├── login/              # Login page
│   │   ├── logout/             # Logout endpoint
│   │   └── dashboard/          # Main application
│   │       ├── +layout.svelte  # Dashboard layout
│   │       ├── +page.svelte    # Dashboard home
│   │       ├── cases/          # Case management
│   │       ├── patients/       # Patient management
│   │       ├── reports/        # Reports & analytics
│   │       └── ...
│   ├── app.html                # HTML template
│   ├── app.css                 # Global styles
│   ├── app.d.ts                # TypeScript definitions
│   └── hooks.server.ts         # Server hooks (auth)
├── docker-compose.yml          # PostgreSQL container
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔒 Security Features

- Bcrypt password hashing (10 rounds)
- HttpOnly cookies for sessions
- CSRF protection
- Session expiration (30 days)
- Role-based access control
- SQL injection prevention (Prisma ORM)

## 📱 Offline Mode

The system supports offline operation for field work:

1. **Cache Reference Data:** Automatically cached on login
2. **Offline Forms:** Submit forms while offline
3. **Auto-Sync:** Automatically syncs when connection is restored
4. **Sync Status:** Visual indicator in navbar

## 📈 Reporting Features

- **Age Distribution:** Bar chart showing age groups
- **Disease Distribution:** Pie chart of disease types
- **Monthly Trends:** Line chart of cases over time
- **Morbidity Rate:** Calculate per 100,000 population
- **PDF Export:** Generate formal reports
- **Excel Export:** Export data for analysis

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# The output will be in ./build directory
```

### Environment Variables (Production)

```env
DATABASE_URL="postgresql://user:password@production-host:5432/dbname"
NODE_ENV="production"
ORIGIN="https://your-domain.com"
SESSION_SECRET="use-a-strong-random-string-here"
```

### Deployment Options

1. **Node.js Server:** Use the built-in adapter
2. **Docker:** Create Dockerfile with Node.js
3. **Cloud:** Deploy to Vercel, Railway, or similar (with PostgreSQL)

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# Restart database
docker-compose restart

# View logs
docker-compose logs postgres
```

### Prisma Issues
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Regenerate client
npm run db:generate
```

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or change port in vite.config.ts
```

## 📚 Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Dexie.js Documentation](https://dexie.org/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [DaisyUI Components](https://daisyui.com/)

## 📄 License

This project is proprietary software developed for Vector-Borne Disease surveillance.

## 👥 Support

For issues or questions, contact the development team.

---

**Version:** 2.0.0  
**Last Updated:** December 2025








