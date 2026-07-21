const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create a default category
  const cat = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });

  // Create a default brand
  const brand = await prisma.brand.upsert({
    where: { slug: 'tech-brand' },
    update: {},
    create: { name: 'TechBrand', slug: 'tech-brand' },
  });

  console.log('✅ Seeded Category:', cat.name, ' & Brand:', brand.name);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());