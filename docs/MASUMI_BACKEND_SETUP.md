# Masumi Services - Backend Setup Guide

**Step-by-step guide for setting up Masumi Payment and Registry services using npm/Node.js**

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14+ installed and running
- Git installed
- npm or yarn package manager
- Blockfrost API key (PreProd): `preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno`

## Step 1: Clone Repositories

```bash
cd C:\Users\Michael\Desktop
git clone https://github.com/masumi-network/masumi-payment-service.git
git clone https://github.com/masumi-network/masumi-registry-service.git
```

## Step 2: Install Dependencies

### Payment Service

```bash
cd masumi-payment-service
npm install
```

### Registry Service

```bash
cd C:\Users\Michael\masumi-registry-service
npm install
```

## Step 3: Set Up PostgreSQL Database

### Create Databases

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create databases
CREATE DATABASE masumi_payment;
CREATE DATABASE masumi_registry;

-- Verify
\l
```

## Step 4: Configure Environment Variables

### Payment Service (.env)

Location: `C:\Users\Michael\Desktop\masumi-payment-service\.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/masumi_payment?schema=public"
ENCRYPTION_KEY="12345678901234567890123456789012"
BLOCKFROST_API_KEY_PREPROD="preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno"
PORT=3001
NETWORK=Preprod
NODE_ENV=development
ADMIN_KEY="rdm_admin_key_secure_change_me"
```

### Registry Service (.env)

Location: `C:\Users\Michael\masumi-registry-service\.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/masumi_registry?schema=public"
BLOCKFROST_API_KEY_PREPROD="preprodHdxaAUbZjQOeUD8YCt421BV4E19zvEno"
PORT=3000
NETWORK=Preprod
NODE_ENV=development
PAYMENT_SERVICE_URL="http://localhost:3001/api/v1"
ADMIN_KEY="rdm_admin_key_secure_change_me"
```

## Step 5: Run Database Migrations

### Payment Service

```bash
cd C:\Users\Michael\Desktop\masumi-payment-service
npm run prisma:generate
npm run prisma:migrate
```

### Registry Service

```bash
cd C:\Users\Michael\masumi-registry-service
npm run prisma:generate
npm run prisma:migrate
```

## Step 6: Start Services

### Using Batch Script (Recommended)

```bash
cd C:\Users\Michael\Desktop\Cardano
.\scripts\start-masumi-services.bat
```

### Manual Start

**Terminal 1 - Payment Service:**
```bash
cd C:\Users\Michael\Desktop\masumi-payment-service
npm run dev
```

**Terminal 2 - Registry Service:**
```bash
cd C:\Users\Michael\masumi-registry-service
npm run dev
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

Save the returned API key for agent registration.

## Troubleshooting

### Port Already in Use

Change PORT in .env files to different ports (e.g., 3002, 3003).

### Database Connection Failed

- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env files
- Verify database exists: `psql -U postgres -l`

### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate:reset

# Or manually drop and recreate database
```

### Dependencies Installation Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Next Steps

1. Get API key from Payment Service
2. Register your agents (see MASUMI_MOBILE_INTEGRATION_GUIDE.md)
3. Configure mobile app to connect to services
4. Test agent registration and event publishing

