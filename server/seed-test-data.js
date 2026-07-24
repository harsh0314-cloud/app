  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();

  async function main() {
    const adminPass = await bcrypt.hash('Admin@1234', 12);
    const userPass = await bcrypt.hash('User@1234', 12);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@storex.com' },
      update: { role: 'ADMIN', password: adminPass, isVerified: true },
      create: { email: 'admin@storex.com', password: adminPass, firstName: 'Admin', lastName: 'User', role: 'ADMIN', isVerified: true },
    });

    const user = await prisma.user.upsert({
      where: { email: 'user@storex.com' },
      update: { password: userPass, isVerified: true },
      create: { email: 'user@storex.com', password: userPass, firstName: 'Jane', lastName: 'Doe', role: 'USER', isVerified: true },
    });

    const category = await prisma.category.upsert({
      where: { slug: 'apparel' },
      update: {},
      create: { name: 'Apparel', slug: 'apparel', description: 'Premium clothing' },
    });

    const brand = await prisma.brand.upsert({
      where: { slug: 'storex' },
      update: {},
      create: { name: 'StoreX', slug: 'storex', description: 'In-house label' },
    });

    const products = [
      { name: 'Essential Cotton Tee', slug: 'essential-cotton-tee', price: '899', comparePrice: '1299', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800' },
      { name: 'Merino Wool Sweater', slug: 'merino-wool-sweater', price: '2499', comparePrice: '3499', img: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800' },
      { name: 'Tailored Chino Trousers', slug: 'tailored-chino-trousers', price: '1899', comparePrice: '2599', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800' },
      { name: 'Leather Derby Shoes', slug: 'leather-derby-shoes', price: '4999', comparePrice: '6999', img: 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800' },
      { name: 'Structured Overshirt', slug: 'structured-overshirt', price: '2199', comparePrice: '2999', img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800' },
      { name: 'Minimal Canvas Tote', slug: 'minimal-canvas-tote', price: '1299', comparePrice: '1799', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800' },
    ];

    for (const [idx, p] of products.entries()) {
      const created = await prisma.product.upsert({
        where: { slug: p.slug },
        update: { price: p.price, comparePrice: p.comparePrice, isActive: true },
        create: {
          name: p.name,
          slug: p.slug,
          sku: p.slug.toUpperCase().replace(/-/g, '_'),
          price: p.price,
          comparePrice: p.comparePrice,
          description: `${p.name} — considered essentials, made to endure. Crafted from premium materials with meticulous attention to detail.`,
          shortDescription: 'Elevated everyday staple.',
          categoryId: category.id,
          brandId: brand.id,
          isActive: true,
          isFeatured: idx < 3,
          isNewArrival: idx % 2 === 0,
          isBestSeller: idx < 2,
        },
      });

      const imgCount = await prisma.productImage.count({ where: { productId: created.id } });
      if (imgCount === 0) {
        await prisma.productImage.create({
          data: { productId: created.id, url: p.img, alt: p.name, isPrimary: true, position: 0 },
        });
      }

      await prisma.inventory.upsert({
        where: { productId: created.id },
        update: {},
        create: { productId: created.id, quantity: idx === 5 ? 3 : 50, lowStockThreshold: 10 },
      });
    }

    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    await prisma.coupon.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: { code: 'WELCOME10', type: 'PERCENTAGE', value: '10', minOrderAmount: '500', maxDiscount: '500', startDate: now, endDate: nextYear, isActive: true },
    });

    console.log('✅ Seed complete');
    console.log('   Admin:', admin.email, '/ Admin@1234');
    console.log('   User: ', user.email, '/ User@1234');
  }

  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
