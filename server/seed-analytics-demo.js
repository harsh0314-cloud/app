// Demo data for the analytics dashboard: extra customers + orders spread
// over the last ~60 days. Idempotent (skips if demo orders already exist).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STATUSES = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING', 'CANCELLED'];

async function main() {
  const existing = await prisma.order.findFirst({ where: { orderNumber: { startsWith: 'SX-DEMO-' } } });
  if (existing) { console.log('Demo orders already seeded — skipping'); return; }

  const products = await prisma.product.findMany({ where: { isActive: true }, take: 10 });
  if (!products.length) { console.log('No products found — run seed-test-data.js first'); return; }

  const users = [];
  for (let i = 1; i <= 6; i++) {
    const email = `demo.customer${i}@storex.com`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, password: '$2a$10$demoDemoDemoDemoDemoDeuJ1v9yZ0y1S1S1S1S1S1S1S1S1S1S1S', firstName: `Demo${i}`, lastName: 'Customer', role: 'USER', isVerified: true },
    });
    users.push(u);
  }

  const addresses = {};
  for (const u of users) {
    let addr = await prisma.address.findFirst({ where: { userId: u.id } });
    if (!addr) {
      addr = await prisma.address.create({
        data: { userId: u.id, firstName: u.firstName, lastName: u.lastName, phone: '9999999999', addressLine1: '42 Demo Street', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India', isDefault: true },
      });
    }
    addresses[u.id] = addr;
  }

  let n = 0;
  for (let day = 59; day >= 0; day--) {
    const perDay = (day % 7 === 0 || day % 7 === 6) ? 2 : (day % 3 === 0 ? 1 : (day % 2));
    for (let j = 0; j < perDay; j++) {
      const user = users[(day + j) % users.length];
      const created = new Date();
      created.setDate(created.getDate() - day);
      created.setHours(9 + ((day * 3 + j * 5) % 12), (day * 7) % 60, 0, 0);
      const p1 = products[(day + j) % products.length];
      const p2 = products[(day + j + 3) % products.length];
      const qty1 = 1 + (j % 2);
      const price1 = parseFloat(p1.price);
      const price2 = parseFloat(p2.price);
      const useTwo = day % 2 === 0;
      const subtotal = price1 * qty1 + (useTwo ? price2 : 0);
      const shipping = subtotal > 999 ? 0 : 49;
      const total = subtotal + shipping;
      const status = STATUSES[(day + j) % STATUSES.length];
      n++;
      await prisma.order.create({
        data: {
          orderNumber: `SX-DEMO-${String(n).padStart(4, '0')}`,
          userId: user.id,
          addressId: addresses[user.id].id,
          status,
          paymentMethod: 'CASH_ON_DELIVERY',
          subtotal, shippingCost: shipping, total,
          createdAt: created,
          updatedAt: created,
          items: {
            create: [
              { productId: p1.id, name: p1.name, price: price1, quantity: qty1, subtotal: price1 * qty1 },
              ...(useTwo ? [{ productId: p2.id, name: p2.name, price: price2, quantity: 1, subtotal: price2 }] : []),
            ],
          },
        },
      });
    }
  }
  console.log(`✅ Seeded ${n} demo orders across 60 days for ${users.length} demo customers`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
