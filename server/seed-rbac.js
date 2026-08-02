// ────────────────────────────────────────────────────────────
// Idempotent RBAC seed — creates one demo account per role for
// development / QA. Passwords are hashed with bcrypt (cost 12).
// Never overwrites existing users; safe to run repeatedly.
//
//   node seed-rbac.js
//   npx prisma db seed          (via package.json "prisma.seed")
// ────────────────────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ACCOUNTS = [
  { email: 'superadmin@storex.test', password: 'SuperAdmin@123', firstName: 'Super', lastName: 'Admin',   role: 'SUPER_ADMIN' },
  { email: 'admin@storex.test',      password: 'Admin@12345',    firstName: 'Alex',  lastName: 'Admin',   role: 'ADMIN' },
  { email: 'manager@storex.test',    password: 'Manager@12345',  firstName: 'Maria', lastName: 'Manager', role: 'MANAGER' },
  { email: 'staff@storex.test',      password: 'Staff@12345',    firstName: 'Sam',   lastName: 'Staff',   role: 'STAFF' },
  { email: 'support@storex.test',    password: 'Support@12345',  firstName: 'Sky',   lastName: 'Support', role: 'SUPPORT' },
];

async function main() {
  // Ensure a baseline category + brand exist (needed by product flows)
  await prisma.category.upsert({
    where: { slug: 'electronics' }, update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });
  await prisma.brand.upsert({
    where: { slug: 'tech-brand' }, update: {},
    create: { name: 'TechBrand', slug: 'tech-brand' },
  });

  const results = [];
  for (const acc of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      results.push({ ...acc, status: 'exists', id: existing.id, existingRole: existing.role });
      continue;
    }
    const hashed = await bcrypt.hash(acc.password, 12);
    const created = await prisma.user.create({
      data: {
        email: acc.email,
        password: hashed,
        firstName: acc.firstName,
        lastName: acc.lastName,
        role: acc.role,
        isActive: true,
        isVerified: true,
      },
      select: { id: true, email: true, role: true },
    });
    results.push({ ...acc, status: 'created', id: created.id });
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('  StoreX RBAC seed — demo accounts');
  console.log('──────────────────────────────────────────────');
  results.forEach((r) => {
    console.log(`  ${r.status.toUpperCase().padEnd(8)} ${r.role.padEnd(12)} ${r.email.padEnd(30)} ${r.status === 'created' ? `pw: ${r.password}` : ''}`);
  });
  console.log('──────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('[seed-rbac] failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
