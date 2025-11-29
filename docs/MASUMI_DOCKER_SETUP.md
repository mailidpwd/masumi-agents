# Masumi Services - Docker Setup Guide

**Step-by-step guide for setting up Masumi services using Docker Compose**

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- Blockfrost API key (PreProd): `preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno`

## Step 1: Verify Docker Installation

```bash
docker --version
docker-compose --version
```

Both should show version numbers.

## Step 2: Prepare Docker Compose File

The `docker-compose.masumi.yml` file has been created in the project root.

**Location:** `C:\Users\Michael\Desktop\Cardano\docker-compose.masumi.yml`

This file includes:
- PostgreSQL database container
- Payment Service container
- Registry Service container
- Network configuration
- Volume mounts for data persistence

## Step 3: Review Configuration

The Docker Compose file uses these environment variables:

```yaml
# Database
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
POSTGRES_DB: masumi_payment

# Services
BLOCKFROST_API_KEY_PREPROD: preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno
CARDANO_NETWORK: preprod
NETWORK: Preprod
```

**Note:** For production, use Docker secrets or environment files for sensitive data.

## Step 4: Start Services

### Using Batch Script (Recommended)

```bash
cd C:\Users\Michael\Desktop\Cardano
.\scripts\docker-start-masumi.bat
```

### Manual Start

```bash
cd C:\Users\Michael\Desktop\Cardano
docker-compose -f docker-compose.masumi.yml up -d
```

The `-d` flag runs containers in detached mode (background).

## Step 5: Check Service Status

### View Running Containers

```bash
docker-compose -f docker-compose.masumi.yml ps
```

You should see:
- `masumi-postgres` - Running
- `masumi-payment-service` - Running
- `masumi-registry-service` - Running

### View Logs

```bash
# All services
docker-compose -f docker-compose.masumi.yml logs -f

# Specific service
docker-compose -f docker-compose.masumi.yml logs -f masumi-payment-service
docker-compose -f docker-compose.masumi.yml logs -f masumi-registry-service
```

## Step 6: Run Database Migrations

Services should automatically run migrations on startup. If not:

```bash
# Payment Service migrations
docker-compose -f docker-compose.masumi.yml exec masumi-payment-service npm run prisma:migrate

# Registry Service migrations
docker-compose -f docker-compose.masumi.yml exec masumi-registry-service npm run prisma:migrate
```

## Step 7: Verify Services

### Test Health Endpoints

```bash
# Payment Service
curl http://localhost:3001/api/v1/health

# Registry Service
curl http://localhost:3000/api/v1/health
```

### Get API Key

```bash
curl http://localhost:3001/api/v1/api-key/
```

## Step 8: Stop Services

### Using Batch Script

```bash
.\scripts\docker-stop-masumi.bat
```

### Manual Stop

```bash
docker-compose -f docker-compose.masumi.yml down
```

To also remove volumes (WARNING: deletes data):

```bash
docker-compose -f docker-compose.masumi.yml down -v
```

## Troubleshooting

### Services Won't Start

**Check Docker is running:**
```bash
docker info
```

**Check port conflicts:**
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
```

**View error logs:**
```bash
docker-compose -f docker-compose.masumi.yml logs
```

### Database Connection Issues

**Check PostgreSQL container:**
```bash
docker-compose -f docker-compose.masumi.yml exec masumi-postgres pg_isready -U postgres
```

**Check database exists:**
```bash
docker-compose -f docker-compose.masumi.yml exec masumi-postgres psql -U postgres -l
```

### Container Build Fails

**Rebuild containers:**
```bash
docker-compose -f docker-compose.masumi.yml build --no-cache
docker-compose -f docker-compose.masumi.yml up -d
```

### Services Restarting Continuously

**Check logs for errors:**
```bash
docker-compose -f docker-compose.masumi.yml logs -f
```

Common issues:
- Database not ready (wait for health check)
- Missing environment variables
- Port conflicts

## Volume Management

### View Volumes

```bash
docker volume ls | grep masumi
```

### Backup Database

```bash
docker-compose -f docker-compose.masumi.yml exec masumi-postgres pg_dump -U postgres masumi_payment > backup.sql
```

### Restore Database

```bash
docker-compose -f docker-compose.masumi.yml exec -T masumi-postgres psql -U postgres masumi_payment < backup.sql
```

## Updating Services

```bash
# Stop services
docker-compose -f docker-compose.masumi.yml down

# Pull latest code
cd ../masumi-payment-service && git pull
cd ../masumi-registry-service && git pull

# Rebuild and start
cd ../Cardano
docker-compose -f docker-compose.masumi.yml up -d --build
```

## Next Steps

1. Verify services are healthy
2. Get API key from Payment Service
3. Register your agents
4. Configure mobile app connection
5. Test agent registration and events

## Production Considerations

For production deployment:

1. **Use Docker secrets** for sensitive data
2. **Configure proper networking** (reverse proxy, SSL)
3. **Set up monitoring** (health checks, logs)
4. **Use persistent volumes** for database
5. **Configure backups** for PostgreSQL
6. **Set resource limits** for containers
7. **Use environment-specific configs**

