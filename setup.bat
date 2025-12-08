@echo off
REM VBD-DB v2.0 Setup Script for Windows
REM This script automates the initial setup process

echo.
echo 🚀 VBD-DB v2.0 Setup Script
echo ================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

echo ✓ Node.js version:
node --version

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed
    echo Please install Docker from https://www.docker.com/get-started
    exit /b 1
)

echo ✓ Docker version:
docker --version

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker Compose is not installed
    exit /b 1
)

echo ✓ Docker Compose version:
docker-compose --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ⚠️  Please edit .env and update SESSION_SECRET before production use!
)

REM Start PostgreSQL
echo 🐘 Starting PostgreSQL database...
docker-compose up -d

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Generate Prisma Client
echo 🔧 Generating Prisma Client...
call npm run db:generate

REM Push schema to database
echo 📊 Pushing database schema...
call npm run db:push

REM Seed database
echo 🌱 Seeding database with initial data...
call npm run db:seed

echo.
echo ✅ Setup completed successfully!
echo.
echo 📝 Next steps:
echo    1. Review and update .env file (especially SESSION_SECRET)
echo    2. (Optional) Add thai-geo.json to prisma\ folder for full Thai geography data
echo    3. Run 'npm run dev' to start the development server
echo.
echo 🔑 Default login credentials:
echo    Username: superadmin
echo    Password: admin123
echo.
echo    ⚠️  IMPORTANT: Change these passwords before production deployment!
echo.
echo 🌐 Once started, visit: http://localhost:5173
echo.
pause







