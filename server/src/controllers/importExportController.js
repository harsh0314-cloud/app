const XLSX = require('xlsx');
const { AppError } = require('../utils/AppError');
const { logAudit, ACTIONS } = require('../utils/audit');
const { validateProductPricing } = require('../utils/pricing');

// Columns supported for product import/export. Order defines the sample-template order.
const PRODUCT_COLUMNS = [
  'name', 'slug', 'sku', 'description', 'shortDescription',
  'price', 'comparePrice', 'costPrice',
  'category', 'brand',
  'stock', 'lowStockThreshold',
  'isActive', 'isFeatured', 'isNewArrival', 'isBestSeller', 'isTrending',
  'isReturnable', 'isExchangeable', 'returnWindowDays',
  'metaTitle', 'metaDescription',
  'imageUrls', // pipe-separated (|) or comma-separated
];

const REQUIRED = ['name', 'sku', 'price', 'category'];

const BOOL_TRUE = new Set(['true', '1', 'yes', 'y', 't']);
const toBool = (v) => (v === undefined || v === null || v === '' ? undefined : BOOL_TRUE.has(String(v).trim().toLowerCase()));
const toNum = (v) => (v === undefined || v === null || v === '' ? undefined : (isFinite(Number(v)) ? Number(v) : NaN));
const toStr = (v) => (v === undefined || v === null ? '' : String(v).trim());
const slugify = (s) => toStr(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// ─── PARSING ────────────────────────────────────────────────────────
function parseUploadedFile(file) {
  if (!file || !file.buffer) throw new AppError('No file uploaded', 400);
  const name = (file.originalname || '').toLowerCase();
  const isCsv = name.endsWith('.csv') || file.mimetype === 'text/csv';
  const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel');
  if (!isCsv && !isXlsx) throw new AppError('Only CSV or Excel (.xlsx/.xls) files are supported', 400);

  const wb = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new AppError('The uploaded file is empty', 400);
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  return rows;
}

function normalizeRow(raw, index) {
  // Support case-insensitive headers
  const row = {};
  for (const key of Object.keys(raw)) {
    row[String(key).trim().replace(/\s+/g, '').toLowerCase()] = raw[key];
  }
  const get = (col) => row[col.toLowerCase()] ?? row[col.toLowerCase().replace(/_/g, '')];

  const parsed = {
    rowNumber: index + 2, // account for header row in the spreadsheet
    name: toStr(get('name')),
    slug: toStr(get('slug')) || slugify(get('name')),
    sku: toStr(get('sku')),
    description: toStr(get('description')) || null,
    shortDescription: toStr(get('shortDescription')) || null,
    price: toNum(get('price')),
    comparePrice: get('comparePrice') === '' ? null : toNum(get('comparePrice')),
    costPrice: get('costPrice') === '' ? null : toNum(get('costPrice')),
    category: toStr(get('category')),
    brand: toStr(get('brand')) || null,
    stock: get('stock') === '' ? 0 : Math.max(0, parseInt(toNum(get('stock')) || 0)),
    lowStockThreshold: get('lowStockThreshold') === '' ? 10 : Math.max(0, parseInt(toNum(get('lowStockThreshold')) || 10)),
    isActive: toBool(get('isActive')),
    isFeatured: toBool(get('isFeatured')),
    isNewArrival: toBool(get('isNewArrival')),
    isBestSeller: toBool(get('isBestSeller')),
    isTrending: toBool(get('isTrending')),
    isReturnable: toBool(get('isReturnable')),
    isExchangeable: toBool(get('isExchangeable')),
    returnWindowDays: get('returnWindowDays') === '' ? undefined : parseInt(toNum(get('returnWindowDays'))),
    metaTitle: toStr(get('metaTitle')) || null,
    metaDescription: toStr(get('metaDescription')) || null,
    imageUrls: toStr(get('imageUrls')).split(/[|,]/).map((s) => s.trim()).filter(Boolean),
  };
  return parsed;
}

function validateRow(r) {
  const errors = [];
  for (const req of REQUIRED) {
    if (r[req] === '' || r[req] === undefined || r[req] === null || Number.isNaN(r[req])) {
      errors.push(`${req} is required`);
    }
  }
  if (typeof r.price === 'number' && !(r.price > 0)) errors.push('price must be > 0');
  if (r.comparePrice != null && !(r.comparePrice > 0)) errors.push('comparePrice must be > 0 if provided');
  if (typeof r.price === 'number' && r.comparePrice != null && r.price > r.comparePrice) {
    errors.push('price cannot be greater than comparePrice (MRP)');
  }
  const priceError = typeof r.price === 'number' ? validateProductPricing(r.price, r.comparePrice) : null;
  if (priceError) errors.push(priceError);
  if (r.slug && !/^[a-z0-9-]+$/.test(r.slug)) errors.push('slug must be lowercase alphanumerics/dashes');
  return errors;
}

async function resolveRefs(prisma, rows) {
  // Category + brand caches by name AND slug
  const catNames = new Set(), brandNames = new Set();
  rows.forEach((r) => { if (r.category) catNames.add(r.category); if (r.brand) brandNames.add(r.brand); });

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { OR: [{ name: { in: [...catNames] } }, { slug: { in: [...catNames].map(slugify) } }] } }),
    prisma.brand.findMany({ where: { OR: [{ name: { in: [...brandNames] } }, { slug: { in: [...brandNames].map(slugify) } }] } }),
  ]);
  const catMap = new Map();
  categories.forEach((c) => { catMap.set(c.name.toLowerCase(), c.id); catMap.set(c.slug.toLowerCase(), c.id); });
  const brandMap = new Map();
  brands.forEach((b) => { brandMap.set(b.name.toLowerCase(), b.id); brandMap.set(b.slug.toLowerCase(), b.id); });
  return { catMap, brandMap };
}

// ─── ENDPOINTS ──────────────────────────────────────────────────────

// POST /api/admin/import/products/preview — validate + duplicate check, do NOT write
exports.previewProductImport = async (req, res, next) => {
  try {
    const raw = parseUploadedFile(req.file);
    const rows = raw.map(normalizeRow);

    const skus = rows.map((r) => r.sku).filter(Boolean);
    const slugs = rows.map((r) => r.slug).filter(Boolean);
    const [existingBySku, existingBySlug] = await Promise.all([
      req.prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } }),
      req.prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } }),
    ]);
    const skuMap = new Map(existingBySku.map((p) => [p.sku, p.id]));
    const slugMap = new Map(existingBySlug.map((p) => [p.slug, p.id]));

    const { catMap, brandMap } = await resolveRefs(req.prisma, rows);

    // detect duplicate SKUs within the file itself
    const seenSku = new Map();
    rows.forEach((r, idx) => {
      if (!r.sku) return;
      if (!seenSku.has(r.sku)) seenSku.set(r.sku, []);
      seenSku.get(r.sku).push(idx);
    });

    const preview = rows.map((r, idx) => {
      const errors = validateRow(r);
      if (r.category && !catMap.has(r.category.toLowerCase())) errors.push(`category "${r.category}" not found (create it first or set exact slug)`);
      if (r.brand && !brandMap.has(r.brand.toLowerCase())) errors.push(`brand "${r.brand}" not found`);
      const dupInFile = seenSku.get(r.sku)?.length > 1 && seenSku.get(r.sku)[0] !== idx;
      if (dupInFile) errors.push('duplicate SKU within the uploaded file');
      const exists = skuMap.has(r.sku) || slugMap.has(r.slug);
      return {
        rowNumber: r.rowNumber,
        action: errors.length ? 'SKIP' : exists ? 'UPDATE' : 'CREATE',
        errors,
        data: r,
        existingId: skuMap.get(r.sku) || slugMap.get(r.slug) || null,
      };
    });

    const summary = {
      total: preview.length,
      willCreate: preview.filter((p) => p.action === 'CREATE').length,
      willUpdate: preview.filter((p) => p.action === 'UPDATE').length,
      willSkip: preview.filter((p) => p.action === 'SKIP').length,
    };

    res.status(200).json({ status: 'success', data: { summary, preview } });
  } catch (e) { next(e); }
};

// POST /api/admin/import/products — actual import (rollback on failure OFF; skip invalid rows)
exports.importProducts = async (req, res, next) => {
  try {
    const raw = parseUploadedFile(req.file);
    const rows = raw.map(normalizeRow);
    const { catMap, brandMap } = await resolveRefs(req.prisma, rows);

    const skus = rows.map((r) => r.sku).filter(Boolean);
    const slugs = rows.map((r) => r.slug).filter(Boolean);
    const existingBySku = await req.prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } });
    const existingBySlug = await req.prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    const skuMap = new Map(existingBySku.map((p) => [p.sku, p.id]));
    const slugMap = new Map(existingBySlug.map((p) => [p.slug, p.id]));

    const report = { total: rows.length, imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    // Each row runs in its own transaction so a failing row never corrupts previous rows.
    for (const r of rows) {
      const errs = validateRow(r);
      const catId = catMap.get(r.category?.toLowerCase());
      const brandId = r.brand ? brandMap.get(r.brand.toLowerCase()) : null;
      if (r.category && !catId) errs.push(`category "${r.category}" not found`);
      if (r.brand && !brandId) errs.push(`brand "${r.brand}" not found`);
      if (errs.length) {
        report.skipped += 1;
        report.errors.push({ rowNumber: r.rowNumber, sku: r.sku, errors: errs });
        continue;
      }

      try {
        await req.prisma.$transaction(async (tx) => {
          const existingId = skuMap.get(r.sku) || slugMap.get(r.slug);
          const commonData = {
            name: r.name, slug: r.slug, sku: r.sku,
            description: r.description, shortDescription: r.shortDescription,
            price: r.price.toString(),
            comparePrice: r.comparePrice != null ? r.comparePrice.toString() : null,
            costPrice: r.costPrice != null ? r.costPrice.toString() : null,
            categoryId: catId,
            brandId: brandId || null,
            metaTitle: r.metaTitle, metaDescription: r.metaDescription,
          };
          ['isActive', 'isFeatured', 'isNewArrival', 'isBestSeller', 'isTrending', 'isReturnable', 'isExchangeable'].forEach((k) => {
            if (r[k] !== undefined) commonData[k] = r[k];
          });
          if (r.returnWindowDays !== undefined && !Number.isNaN(r.returnWindowDays)) commonData.returnWindowDays = r.returnWindowDays;

          if (existingId) {
            await tx.product.update({ where: { id: existingId }, data: commonData });
            await tx.inventory.upsert({
              where: { productId: existingId },
              create: { productId: existingId, quantity: r.stock, lowStockThreshold: r.lowStockThreshold, trackInventory: true },
              update: { quantity: r.stock, lowStockThreshold: r.lowStockThreshold },
            });
            // Only replace images if imageUrls provided (preserve existing when omitted)
            if (r.imageUrls && r.imageUrls.length) {
              await tx.productImage.deleteMany({ where: { productId: existingId } });
              await tx.productImage.createMany({
                data: r.imageUrls.map((url, idx) => ({ productId: existingId, url, isPrimary: idx === 0, position: idx })),
              });
            }
            report.updated += 1;
          } else {
            const created = await tx.product.create({ data: commonData });
            await tx.inventory.create({
              data: { productId: created.id, quantity: r.stock, lowStockThreshold: r.lowStockThreshold, trackInventory: true },
            });
            if (r.imageUrls && r.imageUrls.length) {
              await tx.productImage.createMany({
                data: r.imageUrls.map((url, idx) => ({ productId: created.id, url, isPrimary: idx === 0, position: idx })),
              });
            } else {
              await tx.productImage.create({ data: { productId: created.id, url: 'https://placehold.co/600x600?text=No+Image', isPrimary: true } });
            }
            report.imported += 1;
          }
        });
      } catch (e) {
        report.failed += 1;
        report.errors.push({ rowNumber: r.rowNumber, sku: r.sku, errors: [e?.message || 'unknown error'] });
      }
    }

    await logAudit(req.prisma, req, ACTIONS.IMPORT, {
      entity: 'Product',
      newValue: { total: report.total, imported: report.imported, updated: report.updated, skipped: report.skipped, failed: report.failed },
      message: `Imported products: ${report.imported} created, ${report.updated} updated, ${report.skipped} skipped, ${report.failed} failed`,
      status: report.failed > 0 ? 'FAILURE' : 'SUCCESS',
    });

    res.status(200).json({ status: 'success', data: { report } });
  } catch (e) { next(e); }
};

// GET /api/admin/export/products?format=csv|xlsx&ids=...&filter=all|active|inactive
exports.exportProducts = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const where = {};
    if (req.query.ids) where.id = { in: String(req.query.ids).split(',').filter(Boolean) };
    if (req.query.filter === 'active') where.isActive = true;
    if (req.query.filter === 'inactive') where.isActive = false;
    if (req.query.category) where.category = { slug: req.query.category };
    if (req.query.brand) where.brand = { slug: req.query.brand };
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { sku: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const products = await req.prisma.product.findMany({
      where,
      include: { category: true, brand: true, inventory: true, images: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 20000,
    });

    const rows = products.map((p) => ({
      name: p.name, slug: p.slug, sku: p.sku,
      description: p.description || '', shortDescription: p.shortDescription || '',
      price: p.price, comparePrice: p.comparePrice || '', costPrice: p.costPrice || '',
      category: p.category?.name || '',
      brand: p.brand?.name || '',
      stock: p.inventory?.quantity ?? 0,
      lowStockThreshold: p.inventory?.lowStockThreshold ?? 10,
      isActive: p.isActive, isFeatured: p.isFeatured,
      isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isTrending: p.isTrending,
      isReturnable: p.isReturnable, isExchangeable: p.isExchangeable, returnWindowDays: p.returnWindowDays,
      metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
      imageUrls: p.images.map((i) => i.url).join('|'),
    }));

    await logAudit(req.prisma, req, ACTIONS.EXPORT, {
      entity: 'Product',
      newValue: { format, filters: { ids: req.query.ids, filter: req.query.filter, category: req.query.category, brand: req.query.brand, search: req.query.search }, count: rows.length },
      message: `Exported ${rows.length} products (${format.toUpperCase()})`,
    });

    if (format === 'xlsx') return sendXlsx(res, 'products', PRODUCT_COLUMNS, rows);
    return sendCsv(res, 'products', PRODUCT_COLUMNS, rows);
  } catch (e) { next(e); }
};

// GET /api/admin/import/products/template?format=csv|xlsx — downloadable sample
exports.getProductTemplate = async (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const sample = [{
    name: 'Sample T-Shirt',
    slug: 'sample-t-shirt',
    sku: 'SKU-001',
    description: 'Soft cotton crew-neck tee',
    shortDescription: 'Everyday cotton tee',
    price: 799,
    comparePrice: 1299,
    costPrice: 350,
    category: 'Electronics',
    brand: 'TechBrand',
    stock: 100,
    lowStockThreshold: 10,
    isActive: true, isFeatured: false, isNewArrival: true, isBestSeller: false, isTrending: false,
    isReturnable: true, isExchangeable: true, returnWindowDays: 15,
    metaTitle: 'Sample T-Shirt', metaDescription: 'Buy the sample t-shirt online',
    imageUrls: 'https://placehold.co/600x600?text=Product',
  }];
  if (format === 'xlsx') return sendXlsx(res, 'products-template', PRODUCT_COLUMNS, sample);
  return sendCsv(res, 'products-template', PRODUCT_COLUMNS, sample);
};

// GET /api/admin/import/products/errors?token=... — placeholder for future async imports
exports.downloadErrorReport = async (req, res) => {
  // For synchronous imports we send the errors inline. This endpoint lets clients
  // download a CSV of the errors payload they received from POST /import/products.
  const format = String(req.query.format || 'csv').toLowerCase();
  let payload = [];
  try { payload = JSON.parse(Buffer.from(String(req.query.data || ''), 'base64').toString('utf8')); }
  catch { payload = []; }
  const columns = ['rowNumber', 'sku', 'errors'];
  const rows = (payload || []).map((e) => ({ rowNumber: e.rowNumber, sku: e.sku || '', errors: (e.errors || []).join(' | ') }));
  if (format === 'xlsx') return sendXlsx(res, 'import-errors', columns, rows);
  return sendCsv(res, 'import-errors', columns, rows);
};

// ─── writers ────────────────────────────────────────────────────────
function sendCsv(res, name, columns, rows) {
  const esc = (v) => {
    if (v === undefined || v === null) return '';
    const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.csv"`);
  res.send(`${header}\n${body}\n`);
}
function sendXlsx(res, name, columns, rows) {
  const wb = XLSX.utils.book_new();
  const aoa = [columns, ...rows.map((r) => columns.map((c) => r[c] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 30));
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.xlsx"`);
  res.send(buffer);
}

exports.PRODUCT_COLUMNS = PRODUCT_COLUMNS;
