const express = require('express');
const router = express.Router();

// Metro pincode prefixes (2-digit) → faster delivery
const METRO_PREFIXES = ['11', '40', '56', '60', '70', '50', '20', '38'];
const FREE_SHIPPING_THRESHOLD = 500;
const BASE_COST = 99;

// POST /api/shipping/estimate  { postalCode, subtotal }
router.post('/estimate', (req, res) => {
  const { postalCode = '', subtotal = 0 } = req.body || {};
  const pin = String(postalCode).replace(/\D/g, '');

  if (pin.length !== 6) {
    return res.status(400).json({ status: 'error', message: 'Enter a valid 6-digit pincode' });
  }

  const sub = parseFloat(subtotal) || 0;
  const isMetro = METRO_PREFIXES.includes(pin.slice(0, 2));
  const cost = sub >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_COST;
  const etaMin = isMetro ? 2 : 4;
  const etaMax = isMetro ? 4 : 7;

  const eta = new Date();
  eta.setDate(eta.getDate() + etaMax);

  res.status(200).json({
    status: 'success',
    data: {
      postalCode: pin,
      cost,
      free: cost === 0,
      freeThreshold: FREE_SHIPPING_THRESHOLD,
      zone: isMetro ? 'Metro' : 'Standard',
      etaMin,
      etaMax,
      etaLabel: `${etaMin}–${etaMax} business days`,
      deliveryBy: eta.toISOString().split('T')[0],
    },
  });
});

module.exports = router;
