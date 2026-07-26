/*
 * Seed a handful of DELIVERED orders so that
 *   GET /api/products?sort=best-sellers
 * returns a real, sales-ranked ordering rather than everything at 0.
 *
 * Idempotent: it looks up seeded products by slug, picks the buyer created
 * by seed-test-data.js (user@storex.com), and only creates fresh orders when
 * none tagged with this seed's marker are present.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEED_MARKER = 'SEED-BESTSELLERS';

// Sales pattern: higher quantity => higher rank in best-sellers.
const PATTERN = [
  { slug: 'essential-cotton-tee',   qty: 12 },  // #1
  { slug: 'merino-wool-sweater',    qty:  8 },  // #2
  { slug: 'tailored-chino-trousers',qty:  5 },  // #3
  { slug: 'leather-derby-shoes',    qty:  2 },  // #4
];

async function ensureAddress(userId) {
  const existing = await prisma.address.findFirst({ where: { userId } });
  if (existing) return existing;
  return prisma.address.create({
    data: {
      userId, label: 'Home',
      firstName: 'Jane', lastName: 'Doe', phone: '+91 90000 00000',
      addressLine1: '221B Baker Street', city: 'Mumbai', state: 'MH',
      postalCode: '400001', country: 'IN', isDefault: true,
    },
  });
}

async function main() {
  const buyer = await prisma.user.findUnique({ where: { email: 'user@storex.com' } });
  if (!buyer) { console.error('❌  Run seed-test-data.js first — buyer user@storex.com missing.'); process.exit(1); }

  // Bail if we've already seeded — keeps this file safe to re-run.
  const already = await prisma.order.count({ where: { notes: SEED_MARKER } });
  if (already >= PATTERN.length) {
    console.log(`ℹ  Best-seller orders already seeded (${already} orders). Nothing to do.`);
    return;
  }

  const address = await ensureAddress(buyer.id);

  for (const [i, spec] of PATTERN.entries()) {
    const product = await prisma.product.findUnique({ where: { slug: spec.slug } });
    if (!product) { console.warn(`⚠  Skipping ${spec.slug} — product not found.`); continue; }

    const orderNumber = `SEED-BS-${Date.now()}-${i}`;
    const price = product.price;
    const subtotal = parseFloat(price) * spec.qty;

    await prisma.order.create({
      data: {
        orderNumber,
        userId: buyer.id,
        addressId: address.id,
        status: 'DELIVERED',
        subtotal,
        tax: 0,
        shippingCost: 0,
        discount: 0,
        total: subtotal,
        paymentMethod: 'CASH_ON_DELIVERY',
        notes: SEED_MARKER,
        items: {
          create: [{
            productId: product.id,
            name:      product.name,
            price,
            quantity:  spec.qty,
            subtotal,
          }],
        },
      },
    });
    console.log(`✔  Recorded ${spec.qty}× ${product.name}`);
  }

  console.log('✅  Best-seller seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
