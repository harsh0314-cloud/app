const { z } = require('zod');

// Note: the `validate` middleware only checks presence/shape; it does NOT strip fields
// from req.body, so these schemas are safe to add without changing existing API contracts.

const priceLike = z.union([z.string(), z.number()]);

const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  price: priceLike,
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().min(1, 'Brand is required'),
  isReturnable: z.boolean().optional(),
  isExchangeable: z.boolean().optional(),
  returnWindowDays: z.union([z.string(), z.number()]).optional(),
  returnPolicy: z.string().max(4000).optional().nullable(),
  exchangePolicy: z.string().max(4000).optional().nullable(),
}).passthrough();

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  price: priceLike.optional(),
  isReturnable: z.boolean().optional(),
  isExchangeable: z.boolean().optional(),
  returnWindowDays: z.union([z.string(), z.number()]).optional(),
  returnPolicy: z.string().max(4000).optional().nullable(),
  exchangePolicy: z.string().max(4000).optional().nullable(),
}).passthrough();

const uploadDeleteSchema = z.object({
  url: z.string().min(1, 'Image url is required'),
}).passthrough();

module.exports = { productCreateSchema, productUpdateSchema, uploadDeleteSchema };
