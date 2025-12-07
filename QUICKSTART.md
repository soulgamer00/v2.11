# Quick Start Guide - VBD-DB v2.0

Get up and running in 5 minutes! 🚀

## Prerequisites

Make sure you have these installed:
- ✅ Node.js 18+ ([Download](https://nodejs.org/))
- ✅ Docker Desktop ([Download](https://www.docker.com/get-started))
- ✅ Git (optional)

## Quick Setup (Windows)

### Option 1: Automated Setup (Recommended)

1. **Open PowerShell or Command Prompt in the project folder**

2. **Run the setup script:**
   ```bash
   setup.bat
   ```

3. **Wait for setup to complete** (2-3 minutes)

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:** `http://localhost:5173`

6. **Login with:**
   - Username: `superadmin`
   - Password: `admin123`

That's it! You're ready to go! 🎉

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
copy .env.example .env

# 3. Start database
docker-compose up -d

# 4. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 5. Start dev server
npm run dev
```

## Quick Setup (Mac/Linux)

### Option 1: Automated Setup (Recommended)

```bash
# Make the script executable
chmod +x setup.sh

# Run setup
./setup.sh

# Start dev server
npm run dev
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start database
docker-compose up -d

# 4. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 5. Start dev server
npm run dev
```

## First Login

After setup, visit `http://localhost:5173` and login:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `superadmin` | `admin123` | SUPERADMIN | Full access |
| `admin` | `admin123` | ADMIN | Data entry + offline |
| `user` | `admin123` | USER | Read-only |

⚠️ **IMPORTANT:** Change these passwords immediately!

## First Steps After Login

### 1. Change Your Password
- Click your avatar (top right)
- Go to **Profile**
- Change password

### 2. Add Users
- Navigate to **จัดการผู้ใช้** (User Management)
- Click **เพิ่มผู้ใช้ใหม่** (Add New User)
- Fill in details and assign roles

### 3. Try Adding a Case Report
- Navigate to **บันทึกข้อมูล** (New Case)
- Follow the 3-step wizard:
  1. Search for patient (or add new)
  2. Fill patient information
  3. Enter case details
- Click **บันทึก** (Save)

### 4. View Reports
- Navigate to **รายงาน/สถิติ** (Reports)
- View charts and statistics
- Export to PDF or Excel

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:seed          # Re-seed database

# Docker
docker-compose up -d     # Start database
docker-compose down      # Stop database
docker-compose logs      # View database logs
```

## Troubleshooting

### Port 5173 already in use
```bash
# Kill the process
npx kill-port 5173

# Or change port in vite.config.ts
```

### Database connection error
```bash
# Check if database is running
docker ps

# Restart database
docker-compose restart

# View logs
docker-compose logs postgres
```

### Prisma errors
```bash
# Regenerate Prisma Client
npm run db:generate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Can't login
- Check if database is seeded: `npm run db:seed`
- Check console for errors: Press F12 in browser
- Verify `.env` file exists

## Project Structure at a Glance

```
webreport-v2.1/
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Initial data
├── src/
│   ├── lib/              # Shared code
│   └── routes/           # Pages & API
│       ├── login/        # Login page
│       └── dashboard/    # Main app
├── docker-compose.yml    # Database config
└── package.json          # Dependencies
```

## What's Next?

1. **Read the full [README.md](README.md)** for detailed documentation
2. **Check [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** if migrating from v1.5
3. **Explore the features:**
   - Patient management
   - Case reporting
   - Reports & analytics
   - Offline mode
   - Excel import/export

## Getting Help

- 📚 Full documentation: See [README.md](README.md)
- 🐛 Found a bug? Check console logs (F12)
- 💬 Need help? Contact the development team

---

**Happy coding! 🎉**

Remember to star ⭐ the repository if you find it helpful!




