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

const emailTemplateUpdateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(300, 'Subject too long'),
  bodyHtml: z.string().min(1, 'Email body is required').max(100000, 'Email body too large'),
}).passthrough();

const emailTemplateTestSchema = z.object({
  to: z.string().email('A valid recipient email is required'),
  subject: z.string().max(300).optional(),
  bodyHtml: z.string().max(100000).optional(),
  variables: z.record(z.any()).optional(),
}).passthrough();

module.exports = { productCreateSchema, productUpdateSchema, uploadDeleteSchema, emailTemplateUpdateSchema, emailTemplateTestSchema };
