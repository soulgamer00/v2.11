# Docker Deployment Guide - VBD-DB v2.0

Complete guide for deploying VBD-DB v2.0 using Docker with Cloudflare Tunnel.

## 🐳 Architecture Overview

```
Internet → Cloudflare Tunnel → App Container → Database Container
           (HTTPS, DDoS)       (SvelteKit)     (PostgreSQL)
```

**Benefits:**
- ✅ Free HTTPS with Cloudflare
- ✅ No port forwarding needed
- ✅ DDoS protection
- ✅ Easy deployment
- ✅ Automatic SSL renewal

## 📋 Prerequisites

1. **Docker & Docker Compose** installed
2. **Cloudflare account** (free tier works)
3. **Domain name** (can be on Cloudflare)

## 🚀 Step-by-Step Deployment

### Step 1: Fix Prisma Schema ✅

**Already done!** The schema has been fixed. You can now build successfully.

### Step 2: Setup Cloudflare Tunnel

#### 2.1 Create Cloudflare Account
- Go to https://dash.cloudflare.com/
- Sign up (free)
- Add your domain (or use free subdomain)

#### 2.2 Create Zero Trust Tunnel
```bash
# 1. Go to: https://one.dash.cloudflare.com/
# 2. Navigate to: Networks → Tunnels
# 3. Click "Create a tunnel"
# 4. Choose "Cloudflared"
# 5. Name it: vbddb-tunnel
# 6. Copy the tunnel token (looks like: eyJh...)
```

#### 2.3 Configure Tunnel Routing
```
Public hostname: vbd.yourdomain.com
Service: http://app:3000
```

### Step 3: Environment Setup

Create `.env` file in project root:

```bash
# Copy the example
copy docker.env.example .env

# Edit .env with your values
```

**Required values:**
```env
# Database
POSTGRES_USER=vbduser
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=vbddb

# Cloudflare Tunnel Token (from Step 2.2)
TUNNEL_TOKEN=eyJhY2NvdW50...your-token-here

# App Config
DATABASE_URL=postgresql://vbduser:CHANGE_THIS_PASSWORD@db:5432/vbddb?schema=public
ORIGIN=https://vbd.yourdomain.com
SESSION_SECRET=GENERATE_A_RANDOM_KEY_HERE
NODE_ENV=production
```

**Generate SESSION_SECRET:**
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Linux/Mac
openssl rand -base64 32
```

### Step 4: Build and Deploy

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

**Expected output:**
```
✔ Container vbddb-postgres  Started
✔ Container vbddb-app       Started
✔ Container vbddb-tunnel    Started
```

### Step 5: Initialize Database

```bash
# Wait for database to be healthy (5-10 seconds)
docker-compose exec app npx prisma db push

# Seed initial data
docker-compose exec app npx prisma db seed
```

### Step 6: Test Your Deployment

1. **Visit your domain:** `https://vbd.yourdomain.com`
2. **Login with:** `superadmin / admin123`
3. **Change password immediately!**

## 🔧 Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# App only
docker-compose logs -f app

# Database only
docker-compose logs -f db

# Tunnel only
docker-compose logs -f tunnel
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart app only
docker-compose restart app
```

### Stop Everything
```bash
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build app
```

### Database Backup
```bash
# Backup
docker-compose exec db pg_dump -U vbduser vbddb > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T db psql -U vbduser vbddb < backup_20231205.sql
```

### Access Database Shell
```bash
docker-compose exec db psql -U vbduser -d vbddb
```

### Access App Shell
```bash
docker-compose exec app sh
```

## 🔍 Troubleshooting

### Problem 1: Prisma Schema Error ✅
**Error:** `The relation field 'tambon' on model 'Patient' is missing an opposite relation field`

**Solution:** Already fixed! The schema now includes `patients Patient[]` in the `Tambon` model.

### Problem 2: Build Takes Too Long
**Solution:** `.dockerignore` file has been created. Next build will be much faster.

**Check file size:**
```bash
# Before .dockerignore: ~416MB
# After .dockerignore: ~50MB
```

### Problem 3: Can't Connect to Database
**Check database is running:**
```bash
docker-compose ps db

# Should show "healthy"
```

**Fix:**
```bash
# Restart database
docker-compose restart db

# Check logs
docker-compose logs db
```

### Problem 4: Tunnel Not Working
**Check tunnel status:**
```bash
docker-compose logs tunnel
```

**Common issues:**
- Invalid `TUNNEL_TOKEN` → Check Cloudflare dashboard
- Tunnel not configured → Add public hostname in Cloudflare
- DNS not propagated → Wait 5-10 minutes

**Fix:**
```bash
# Restart tunnel
docker-compose restart tunnel
```

### Problem 5: App Won't Start
**Check logs:**
```bash
docker-compose logs app
```

**Common issues:**
- Missing `.env` file
- Wrong `DATABASE_URL`
- Database not ready

**Fix:**
```bash
# Ensure database is healthy first
docker-compose ps db

# Then restart app
docker-compose restart app
```

## 📊 Monitoring

### Check Service Health
```bash
# All services status
docker-compose ps

# App health
curl http://localhost:3000/

# Database health
docker-compose exec db pg_isready -U vbduser
```

### Resource Usage
```bash
# CPU and Memory
docker stats

# Disk usage
docker system df
```

## 🔒 Security Checklist

Before going live:

- [ ] Change `POSTGRES_PASSWORD` from default
- [ ] Generate strong `SESSION_SECRET`
- [ ] Update default user passwords in app
- [ ] Set correct `ORIGIN` domain
- [ ] Enable Cloudflare firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Review Cloudflare security settings
- [ ] Enable 2FA on Cloudflare account

## 🎯 Production Optimization

### Enable Cloudflare Features
1. **SSL/TLS:** Set to "Full" mode
2. **Caching:** Configure cache rules
3. **Firewall:** Enable WAF rules
4. **DDoS:** Auto-enabled
5. **Rate Limiting:** Configure if needed

### App Performance
```yaml
# In docker-compose.yml, add to app service:
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Database Tuning
```yaml
# In docker-compose.yml, add to db service:
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "max_connections=200"
```

## 📱 Scaling

### Horizontal Scaling
```bash
# Run multiple app instances
docker-compose up -d --scale app=3

# Add load balancer (nginx)
```

### Database Replication
```yaml
# Add read replica service
db-replica:
  image: postgres:16-alpine
  # Configure as replica
```

## 🔄 Updates

### Rolling Update
```bash
# 1. Pull new code
git pull

# 2. Build new image
docker-compose build app

# 3. Update with zero downtime
docker-compose up -d --no-deps --build app
```

### Database Migration
```bash
# 1. Backup first
docker-compose exec db pg_dump -U vbduser vbddb > backup.sql

# 2. Run migrations
docker-compose exec app npx prisma migrate deploy

# 3. Verify
docker-compose logs app
```

## 📝 Maintenance

### Regular Tasks

**Daily:**
- Check logs for errors
- Monitor disk space

**Weekly:**
- Database backup
- Review access logs
- Check for updates

**Monthly:**
- Update dependencies
- Security audit
- Performance review

### Automated Backups

Create `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U vbduser vbddb > /backups/vbddb_$DATE.sql
find /backups -name "vbddb_*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
# Backup daily at 2 AM
0 2 * * * /path/to/backup.sh
```

## 🆘 Emergency Procedures

### System Down
```bash
# 1. Check status
docker-compose ps

# 2. View logs
docker-compose logs --tail=100

# 3. Restart all
docker-compose restart

# 4. If still down, rebuild
docker-compose down
docker-compose up -d --build
```

### Database Corruption
```bash
# 1. Stop app
docker-compose stop app

# 2. Restore from backup
docker-compose exec -T db psql -U vbduser vbddb < backup_latest.sql

# 3. Start app
docker-compose start app
```

### Full System Reset
```bash
# ⚠️ WARNING: This deletes ALL data!

# 1. Stop and remove everything
docker-compose down -v

# 2. Remove images
docker-compose rm

# 3. Fresh start
docker-compose up -d --build

# 4. Re-initialize database
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma db seed
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

## 🎉 Success Checklist

After deployment, verify:

- [ ] App accessible via domain
- [ ] HTTPS working (green padlock)
- [ ] Can login with admin account
- [ ] Database persists after restart
- [ ] All forms working
- [ ] Reports generating correctly
- [ ] File uploads working (if applicable)
- [ ] Logs are clean (no errors)

## 🚀 You're Live!

Your VBD-DB v2.0 is now deployed and accessible securely via Cloudflare Tunnel!

**Next steps:**
1. Change all default passwords
2. Create user accounts
3. Train your team
4. Set up monitoring
5. Configure backups

---

**Need help?** Check the logs first:
```bash
docker-compose logs -f
```









