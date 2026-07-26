const { z } = require('zod');

// Reasons displayed to the customer during the return flow.
const REASONS = [
  'WRONG_SIZE',
  'WRONG_PRODUCT',
  'DAMAGED',
  'DEFECTIVE',
  'QUALITY',
  'CHANGED_MIND',
  'OTHER',
];

const createReturnSchema = z.object({
  orderId: z.string().min(1, 'Order id is required'),
  type: z.enum(['RETURN', 'EXCHANGE']),
  reason: z.string().min(1, 'Reason is required'),
  subReason: z.enum(REASONS).optional().nullable(),
  comments: z.string().max(2000).optional().nullable(),
  refundMethod: z.enum(['ORIGINAL', 'WALLET', 'STORE_CREDIT']).optional().nullable(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        reason: z.string().optional().nullable(),
        subReason: z.enum(REASONS).optional().nullable(),
        exchangeSize: z.string().optional().nullable(),
        exchangeVariantId: z.string().optional().nullable(),
      })
    )
    .min(1, 'Select at least one item to return or exchange'),
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string().optional().nullable() }))
    .max(5, 'A maximum of 5 images is allowed')
    .optional()
    .default([]),
}).passthrough();

const adminUpdateReturnSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'APPROVED',
      'REJECTED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'REFUND_PROCESSED',
      'EXCHANGE_SHIPPED',
      'COMPLETED',
      'CANCELLED',
    ])
    .optional(),
  adminNote: z.string().max(2000).optional().nullable(),
  refundAmount: z.union([z.string(), z.number()]).optional().nullable(),
  refundMethod: z.enum(['ORIGINAL', 'WALLET', 'STORE_CREDIT']).optional().nullable(),
  pickupScheduledAt: z.string().datetime().optional().nullable(),
  exchangeTrackingNumber: z.string().optional().nullable(),
}).passthrough();

module.exports = { REASONS, createReturnSchema, adminUpdateReturnSchema };
