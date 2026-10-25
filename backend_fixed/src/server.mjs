import env from './config/env.mjs';
import { connectDatabase, disconnectDatabase } from './config/db.mjs';
import { createApp } from './app.mjs';

async function main() {
  const connection = await connectDatabase();
  const app = createApp();
  const server = app.listen(env.port, () => {
    /* eslint-disable no-console */
    console.log('');
    console.log('  HCM Lite API');
    console.log(`  → http://localhost:${env.port}/api/health`);
    console.log(`  → database: ${connection.mode} (${connection.mode === 'embedded' ? 'persisted ./.data/mongo' : 'MONGODB_URI'})`);
    console.log(`  → environment: ${env.nodeEnv}`);
    console.log(`  → AI provider: ${env.aiApiKey ? `configured (${env.aiModel})` : 'fallback mode (no AI_API_KEY)'}`);
    if (!env.aiApiKey) {
      console.log('  → run "npm run seed" to create demo accounts');
    }
    console.log('');
    /* eslint-enable no-console */
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down…`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[fatal] Failed to start HCM Lite API:', error.message);
  console.error('Check MONGODB_URI / JWT_SECRET configuration in server/.env');
  process.exit(1);
});
