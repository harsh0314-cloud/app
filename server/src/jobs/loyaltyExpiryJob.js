// Nightly loyalty-points expiry sweep.
// Uses node-cron so we don't need an external scheduler.
// Runs at 03:15 server-time every day.

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const loyalty = require('../utils/loyalty');

let started = false;
let running = false;

async function run(prisma) {
  if (running) return { skipped: true };
  running = true;
  try {
    const result = await loyalty.expireAll(prisma);
    // eslint-disable-next-line no-console
    console.log(`[loyalty-expiry] ${new Date().toISOString()} · users=${result.users} · expired=${result.expired}`);
    return result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[loyalty-expiry] failed:', e.message);
    return { error: e.message };
  } finally {
    running = false;
  }
}

function start(prismaFromApp) {
  if (started) return;
  started = true;
  const prisma = prismaFromApp || new PrismaClient();
  // 03:15 every day
  cron.schedule('15 3 * * *', () => run(prisma));
  // eslint-disable-next-line no-console
  console.log('[loyalty-expiry] scheduled: 03:15 daily');
}

module.exports = { start, run };
