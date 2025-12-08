#!/bin/bash

# VBD-DB v2.0 Setup Script
# This script automates the initial setup process

set -e

echo "🚀 VBD-DB v2.0 Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

echo "✓ Docker version: $(docker --version)"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker Compose version: $(docker-compose --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and update SESSION_SECRET before production use!"
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run db:generate

# Push schema to database
echo "📊 Pushing database schema..."
npm run db:push

# Seed database
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and update .env file (especially SESSION_SECRET)"
echo "   2. (Optional) Add thai-geo.json to prisma/ folder for full Thai geography data"
echo "   3. Run 'npm run dev' to start the development server"
echo ""
echo "🔑 Default login credentials:"
echo "   Username: superadmin"
echo "   Password: admin123"
echo ""
echo "   ⚠️  IMPORTANT: Change these passwords before production deployment!"
echo ""
echo "🌐 Once started, visit: http://localhost:5173"
echo ""







