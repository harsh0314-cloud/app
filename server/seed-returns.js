/**
 * Seed data for testing the Returns & Exchange module.
 * Creates: admin + customer, a returnable product with inventory + variants,
 * and a delivered order for the customer.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Test@1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@storex.test' },
    update: {},
    create: {
      email: 'admin@storex.test',
      password,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@storex.test' },
    update: {},
    create: {
      email: 'customer@storex.test',
      password,
      firstName: 'Riya',
      lastName: 'Shopper',
      role: 'USER',
      isVerified: true,
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: { name: 'Clothing', slug: 'clothing' },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'storex' },
    update: {},
    create: { name: 'StoreX', slug: 'storex' },
  });

  const product = await prisma.product.upsert({
    where: { slug: 'crew-neck-tee' },
    update: {
      isReturnable: true,
      isExchangeable: true,
      returnWindowDays: 15,
      returnPolicy: 'Unused, tags on. Ships in original packaging.',
      exchangePolicy: 'Free size exchange within 15 days.',
    },
    create: {
      name: 'Essential Crew-Neck Tee',
      slug: 'crew-neck-tee',
      sku: 'CREW-TEE-001',
      price: '899.00',
      description: 'Soft-hand cotton crew neck.',
      categoryId: category.id,
      brandId: brand.id,
      isReturnable: true,
      isExchangeable: true,
      returnWindowDays: 15,
      returnPolicy: 'Unused, tags on. Ships in original packaging.',
      exchangePolicy: 'Free size exchange within 15 days.',
    },
  });

  // Image
  await prisma.productImage.upsert({
    where: { id: `${product.id}-image` }, // synthetic id ignored on create; but we don't have unique — fallback:
    update: {},
    create: {
      id: `${product.id}-image`,
      productId: product.id,
      url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
      isPrimary: true,
    },
  }).catch(() => {});

  // Inventory
  await prisma.inventory.upsert({
    where: { productId: product.id },
    update: { quantity: 25 },
    create: { productId: product.id, quantity: 25 },
  });

  // Variants for exchange sizes
  const sizes = ['S', 'M', 'L', 'XL'];
  for (const size of sizes) {
    await prisma.productVariant.upsert({
      where: { sku: `${product.sku}-${size}` },
      update: { stock: 10 },
      create: { productId: product.id, name: 'Size', value: size, sku: `${product.sku}-${size}`, stock: 10 },
    });
  }

  // Address
  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: '9990001111',
      addressLine1: '221B Baker St',
      city: 'Bengaluru',
      state: 'KA',
      postalCode: '560001',
      country: 'India',
      isDefault: true,
    },
  });

  // Delivered order
  const order = await prisma.order.create({
    data: {
      orderNumber: 'ORD-SEED-' + Date.now(),
      userId: customer.id,
      addressId: address.id,
      subtotal: '1798.00',
      discount: '0',
      shippingCost: '0',
      tax: '323.64',
      total: '2121.64',
      status: 'DELIVERED',
      paymentMethod: 'RAZORPAY',
      deliveredAt: new Date(),
      shippedAt: new Date(Date.now() - 86400000),
      items: {
        create: [
          {
            productId: product.id,
            name: product.name,
            size: 'M',
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
            price: '899.00',
            quantity: 2,
            subtotal: '1798.00',
          },
        ],
      },
    },
  });

  // Simulate a captured Razorpay payment on this order
  await prisma.payment.create({
    data: {
      orderId: order.id,
      method: 'RAZORPAY',
      status: 'COMPLETED',
      amount: '2121.64',
      currency: 'inr',
      transactionId: 'pay_seed_' + Date.now(),
    },
  });

  console.log('✅ Seeded:');
  console.log('   admin:   admin@storex.test / Test@1234');
  console.log('   user:    customer@storex.test / Test@1234');
  console.log('   product:', product.name, '(id:', product.id + ')');
  console.log('   order:  ', order.orderNumber, '(delivered — eligible for return)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
