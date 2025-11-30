/**
 * Create Admin API Key in Masumi Payment Service Database
 * 
 * This script creates an admin API key directly in the database
 * so we can use it to register agents.
 */

const { PrismaClient, Permission, ApiKeyStatus, Network } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:password@masumi-postgres-payment:5432/postgres?schema=public',
    },
  },
});

function generateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function createAdminApiKey() {
  try {
    console.log('🔑 Creating Admin API Key...\n');

    // Generate API key token (format: masumi-payment-admin-{id})
    const cuid = require('@paralleldrive/cuid2');
    const createId = cuid.createId;
    const apiKeyToken = 'masumi-payment-admin-' + createId();
    const tokenHash = generateHash(apiKeyToken);

    console.log('Generated API Key Token:', apiKeyToken);
    console.log('Token Hash:', tokenHash);
    console.log('\nInserting into database...\n');

    // Check if admin key already exists
    const existingAdmin = await prisma.apiKey.findFirst({
      where: {
        permission: Permission.Admin,
        status: ApiKeyStatus.Active,
      },
    });

    if (existingAdmin) {
      console.log('✅ Admin API key already exists!');
      console.log('Token:', existingAdmin.token);
      console.log('ID:', existingAdmin.id);
      return existingAdmin.token;
    }

    // Create new admin API key
    const apiKey = await prisma.apiKey.create({
      data: {
        token: apiKeyToken,
        tokenHash: tokenHash,
        status: ApiKeyStatus.Active,
        permission: Permission.Admin,
        networkLimit: [Network.Mainnet, Network.Preprod],
        usageLimited: false,
      },
    });

    console.log('✅ Admin API Key created successfully!');
    console.log('Token:', apiKey.token);
    console.log('ID:', apiKey.id);
    console.log('Permission:', apiKey.permission);
    console.log('Status:', apiKey.status);
    console.log('\n📋 Use this token in your .env file:');
    console.log(`MASUMI_API_KEY=${apiKey.token}\n`);

    return apiKey.token;
  } catch (error) {
    console.error('❌ Error creating API key:', error.message);
    if (error.code === 'P2002') {
      console.error('   API key with this token already exists');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  createAdminApiKey()
    .then((token) => {
      console.log('\n🎉 Success! You can now use this API key to register agents.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create API key:', error);
      process.exit(1);
    });
}

module.exports = { createAdminApiKey };

