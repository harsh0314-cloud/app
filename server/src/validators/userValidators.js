const { z } = require('zod');

const addressSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phone: z.string().min(6, 'A valid phone number is required').max(20),
  addressLine1: z.string().min(3, 'Address line 1 is required').max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, 'City is required').max(80),
  state: z.string().min(1, 'State is required').max(80),
  postalCode: z.string().min(3, 'Postal code is required').max(20),
  country: z.string().min(2, 'Country is required').max(80),
  isDefault: z.boolean().optional(),
});

// PATCH allows partial updates
const addressUpdateSchema = addressSchema.partial();

const recentlyViewedSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
});

module.exports = { addressSchema, addressUpdateSchema, recentlyViewedSchema };
