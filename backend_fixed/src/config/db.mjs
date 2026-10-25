import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import env from './env.mjs';

let memoryServer = null;

/**
 * Connect to MongoDB.
 * - Uses MONGODB_URI when provided.
 * - In development, when no URI is set, boots a real mongod via
 *   mongodb-memory-server with a persistent data directory so demo data
 *   survives server restarts. Production always requires MONGODB_URI.
 */
export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    return { mode: 'external', uri: env.mongoUri };
  }

  if (env.isProduction) {
    throw new Error('MONGODB_URI is required in production. Refusing to start.');
  }

  const dbPath = path.join(env.dataDir, 'mongo');
  fs.mkdirSync(dbPath, { recursive: true });

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: 'hcm_lite', dbPath, storageEngine: 'wiredTiger' },
    // keep the downloaded binary close to the project for repeatable demo runs
    binary: { downloadDir: path.join(env.dataDir, 'mongodb-binaries') }
  });

  const uri = memoryServer.getUri('hcm_lite');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  return { mode: 'embedded', uri };
}

export async function disconnectDatabase() {
  await mongoose.connection.close().catch(() => {});
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
    memoryServer = null;
  }
}

export function databaseState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}
