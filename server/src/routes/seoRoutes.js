const express = require('express');
const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'https://storex-frontend-gold.vercel.app';

// GET /api/seo/sitemap.xml — dynamically generated sitemap including active products & categories
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      req.prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      req.prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    ]);

    const staticRoutes = ['', 'products', 'login', 'register'];
    const urls = [];

    staticRoutes.forEach((r) => {
      urls.push(`  <url><loc>${CLIENT_URL}/${r}</loc><changefreq>daily</changefreq><priority>${r === '' ? '1.0' : '0.7'}</priority></url>`);
    });
    categories.forEach((c) => {
      urls.push(`  <url><loc>${CLIENT_URL}/products?category=${c.slug}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`);
    });
    products.forEach((p) => {
      const lastmod = new Date(p.updatedAt).toISOString();
      urls.push(`  <url><loc>${CLIENT_URL}/products/${p.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
