const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  console.log('Creating corsair tables...');
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS corsair_integrations (
      id UUID PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      dek TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS corsair_accounts (
      id UUID PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      integration_id UUID NOT NULL REFERENCES corsair_integrations(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}',
      dek TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(tenant_id, integration_id)
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS corsair_entities (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES corsair_accounts(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      UNIQUE(account_id, entity_type, entity_id)
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS corsair_events (
      id UUID PRIMARY KEY,
      account_id UUID NOT NULL REFERENCES corsair_accounts(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS corsair_permissions (
      id UUID PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      plugin TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      args TEXT,
      tenant_id TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      error TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  
  console.log('Corsair tables created successfully!');
  await client.end();
}

main().catch(console.error);
