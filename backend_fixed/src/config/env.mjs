import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..', '..');
export const repoRoot = path.resolve(serverRoot, '..');

// server/.env wins, repo-root .env is a fallback
dotenv.config({ path: path.join(serverRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'hcm-lite-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  timezone: process.env.COMPANY_TIMEZONE || 'Asia/Karachi',
  seedEnabled: bool(process.env.SEED_ENABLED, true),
  aiApiKey: process.env.AI_API_KEY || '',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',
  aiTimeoutMs: 15000,
  dataDir: path.join(repoRoot, '.data')
};

const INSECURE_SECRETS = new Set(['hcm-lite-dev-secret-change-me', 'change-me-to-a-long-random-secret', '']);
if (env.isProduction) {
  if (!process.env.JWT_SECRET || INSECURE_SECRETS.has(process.env.JWT_SECRET)) {
    throw new Error('[fatal] JWT_SECRET must be set to a strong secret in production.');
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('[fatal] JWT_SECRET must be at least 32 characters in production.');
  }
} else if (!process.env.JWT_SECRET || INSECURE_SECRETS.has(process.env.JWT_SECRET)) {
  // eslint-disable-next-line no-console
  console.warn('[security] JWT_SECRET is using an insecure default. Set a real secret before going to production.');
}

export default env;
