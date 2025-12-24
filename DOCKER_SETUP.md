# Docker Compose Setup Guide

This guide will help you set up and run PostgreSQL and Redis using Docker Compose.

## Prerequisites

1. **Docker Desktop** must be installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Make sure Docker Desktop is **running** (check the Docker icon in your menu bar/taskbar)

## Quick Start

### 1. Start Docker Desktop

Make sure Docker Desktop is running before proceeding.

**macOS:** Open Docker Desktop from Applications  
**Windows:** Open Docker Desktop from Start Menu  
**Linux:** Start Docker service: `sudo systemctl start docker`

### 2. Start Services

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5433` (mapped from container port 5432)
- **Redis** on port `6379`

The `-d` flag runs containers in detached mode (background).

### 3. Check Services Status

```bash
docker-compose ps
```

You should see both services running:
```
NAME                      STATUS          PORTS
monnify-payroll-db        Up (healthy)    0.0.0.0:5433->5432/tcp
monnify-payroll-redis     Up (healthy)    0.0.0.0:6379->6379/tcp
```

### 4. Initialize Database

After PostgreSQL is running, initialize the database with migrations:

```bash
# Make the script executable (if not already)
chmod +x scripts/init-db.sh

# Run the initialization script
./scripts/init-db.sh
```

Or manually run migrations:

```bash
# Wait for PostgreSQL to be ready, then run migrations
for migration in migrations/*.sql; do
  echo "Running migration: $migration"
  PGPASSWORD=payroll_password psql -h localhost -p 5433 -U payroll_user -d payroll_db -f "$migration"
done
```

### 5. Verify Connection

Test the database connection:

```bash
# Test PostgreSQL
PGPASSWORD=payroll_password psql -h localhost -p 5433 -U payroll_user -d payroll_db -c "SELECT 1;"

# Test Redis
redis-cli -p 6379 ping
# Should return: PONG
```

## Common Commands

### View Logs

```bash
# View all logs
docker-compose logs

# View logs for specific service
docker-compose logs postgres
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f
```

### Stop Services

```bash
docker-compose stop
```

### Start Services (after stopping)

```bash
docker-compose start
```

### Stop and Remove Containers

```bash
docker-compose down
```

### Stop and Remove Containers + Volumes (⚠️ Deletes Data)

```bash
docker-compose down -v
```

This will delete all database data. Use with caution!

### Restart Services

```bash
docker-compose restart
```

## Environment Variables

The docker-compose.yml uses these default values:

**PostgreSQL:**
- User: `payroll_user`
- Password: `payroll_password`
- Database: `payroll_db`
- Port: `5433` (host) → `5432` (container)

**Redis:**
- Port: `6379`

Make sure your `.env` file matches these values:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=payroll_db
DB_USER=payroll_user
DB_PASSWORD=payroll_password

REDIS_HOST=localhost
REDIS_PORT=6379
```

## Troubleshooting

### Docker Daemon Not Running

**Error:** `Cannot connect to the Docker daemon`

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start (Docker icon should be steady, not animating)
3. Try again: `docker-compose up -d`

### Port Already in Use

**Error:** `Bind for 0.0.0.0:5433 failed: port is already allocated`

**Solutions:**

1. **Check what's using the port:**
   ```bash
   # macOS/Linux
   lsof -i :5433
   
   # Windows
   netstat -ano | findstr :5433
   ```

2. **Stop the conflicting service** or **change the port** in docker-compose.yml:
   ```yaml
   ports:
     - "5434:5432"  # Change 5433 to 5434
   ```
   Then update `DB_PORT=5434` in your `.env` file.

### PostgreSQL Connection Refused

**Error:** `Connection refused` when trying to connect

**Solutions:**

1. **Check if PostgreSQL container is running:**
   ```bash
   docker-compose ps
   ```

2. **Check container logs:**
   ```bash
   docker-compose logs postgres
   ```

3. **Wait for health check:**
   ```bash
   # Wait until you see "healthy" status
   docker-compose ps
   ```

4. **Restart the container:**
   ```bash
   docker-compose restart postgres
   ```

### Database Already Exists

**Error:** `database "payroll_db" already exists`

**Solution:** This is normal if you've run migrations before. The database is already set up.

### Permission Denied on init-db.sh

**Error:** `Permission denied: ./scripts/init-db.sh`

**Solution:**
```bash
chmod +x scripts/init-db.sh
```

## Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - PostgreSQL data
- `redis_data` - Redis data

These volumes persist even when containers are stopped. To completely remove data:

```bash
docker-compose down -v
```

## Health Checks

Both services have health checks configured:
- **PostgreSQL:** Checks every 10 seconds
- **Redis:** Checks every 10 seconds

You can see health status with:
```bash
docker-compose ps
```

## Next Steps

After Docker services are running:

1. ✅ Verify services are healthy: `docker-compose ps`
2. ✅ Initialize database: `./scripts/init-db.sh`
3. ✅ Start your application: `npm run dev`
4. ✅ Test the health endpoint: `curl http://localhost:3008/health`

## Production Considerations

For production:
- Use environment variables for sensitive data
- Set up proper backup strategies
- Use managed database services (AWS RDS, etc.) instead of Docker
- Configure proper security settings
- Use Docker secrets for passwords

