// Shared UI mappings for return/exchange statuses. Used across customer + admin surfaces.

export const STATUS_ORDER = [
  'PENDING',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'REFUND_PROCESSED',
  'EXCHANGE_SHIPPED',
  'COMPLETED',
];

export const STATUS_LABEL = {
  PENDING:          'Pending',
  APPROVED:         'Approved',
  REJECTED:         'Rejected',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP:        'Picked Up',
  REFUND_PROCESSED: 'Refund Processed',
  EXCHANGE_SHIPPED: 'Exchange Shipped',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
  // Legacy compatibility
  REQUESTED:        'Pending',
};

export const STATUS_BADGE = {
  PENDING:          'bg-amber-100 text-amber-800',
  APPROVED:         'bg-blue-100 text-blue-800',
  REJECTED:         'bg-red-100 text-red-800',
  PICKUP_SCHEDULED: 'bg-indigo-100 text-indigo-800',
  PICKED_UP:        'bg-violet-100 text-violet-800',
  REFUND_PROCESSED: 'bg-emerald-100 text-emerald-800',
  EXCHANGE_SHIPPED: 'bg-teal-100 text-teal-800',
  COMPLETED:        'bg-green-100 text-green-800',
  CANCELLED:        'bg-gray-100 text-gray-700',
  REQUESTED:        'bg-amber-100 text-amber-800',
};

// Which steps show on the customer-facing timeline for a given request type.
export const timelineForType = (type) => {
  const base = ['PENDING', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP'];
  if (type === 'EXCHANGE') return [...base, 'EXCHANGE_SHIPPED', 'COMPLETED'];
  return [...base, 'REFUND_PROCESSED', 'COMPLETED'];
};
