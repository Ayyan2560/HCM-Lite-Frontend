import env from '../src/config/env.mjs';
import { connectDatabase, disconnectDatabase } from '../src/config/db.mjs';
import { seedDemoData } from '../src/services/seedService.mjs';

async function main() {
  if (env.isProduction) {
    console.error('[seed] Refusing to seed demo data when NODE_ENV=production.');
    process.exit(1);
  }
  if (!env.seedEnabled) {
    console.error('[seed] SEED_ENABLED is false. Enable it in server/.env to seed demo data.');
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  const connection = await connectDatabase();
  console.log(`[seed] connected (${connection.mode})`);

  const result = await seedDemoData({ force });
  console.log('');
  console.log('  HCM Lite demo data is ready');
  console.log(`  Company: ${result.company}`);
  console.log(`  Employees: ${result.employees} · attendance created this run: ${result.attendanceCreated}`);
  console.log('');
  console.log('  Demo credentials');
  for (const account of result.accounts) {
    console.log(`   ${account.role.padEnd(8)} ${account.email}  /  ${account.password}`);
  }
  console.log('');
  console.log('  Start the app with: npm run dev');
  console.log('');

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error('[seed] failed:', error);
  await disconnectDatabase();
  process.exit(1);
});
