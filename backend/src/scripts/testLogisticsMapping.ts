/**
 * Pure-logic checks for the Agri Agent integration (no DB, no network).
 *   npm run test:logistics
 */
import {
  normalizeLogisticsStatus,
  LOGISTICS_TO_ORDER_STATUS,
  resolveNextOrderStatus,
  shouldApplyLogisticsStatus,
  buildAgriAgentPayload,
  NON_LOGISTICS_FIELDS,
} from '../services/logisticsIntegrationService';

let passed = 0;
let failed = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `  → got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
};

// Phase 6 mapping table
const table: Array<[string, string]> = [
  ['PENDING', 'pending'],
  ['PICKUP_ASSIGNED', 'accepted'],
  ['ACCEPTED', 'accepted'],
  ['PICKED_UP', 'packed'],
  ['IN_TRANSIT', 'shipped'],
  ['OUT_FOR_DELIVERY', 'shipped'],
  ['DELIVERED', 'delivered'],
  ['CANCELLED', 'cancelled'],
  ['FAILED_DELIVERY', 'cancelled'],
  ['RETURNED', 'cancelled'],
];
for (const [ls, os] of table) {
  const n = normalizeLogisticsStatus(ls);
  check(`map ${ls} → ${os}`, n ? LOGISTICS_TO_ORDER_STATUS[n] : null, os);
}

// Normalisation
check('normalize lower-case', normalizeLogisticsStatus('in transit'), 'IN_TRANSIT');
check('normalize hyphen', normalizeLogisticsStatus('out-for-delivery'), 'OUT_FOR_DELIVERY');
check('alias DRIVER_ASSIGNED', normalizeLogisticsStatus('DRIVER_ASSIGNED'), 'PICKUP_ASSIGNED');
check('alias CANCELED (US)', normalizeLogisticsStatus('canceled'), 'CANCELLED');
check('unknown → null', normalizeLogisticsStatus('TELEPORTED'), null);
check('empty → null', normalizeLogisticsStatus(''), null);

// Forward-only order status
check('pending → shipped advances', resolveNextOrderStatus('pending', 'shipped'), 'shipped');
check('shipped → packed ignored (late PICKED_UP)', resolveNextOrderStatus('shipped', 'packed'), null);
check('accepted → accepted ignored', resolveNextOrderStatus('accepted', 'accepted'), null);
check('shipped → cancelled allowed', resolveNextOrderStatus('shipped', 'cancelled'), 'cancelled');
check('delivered is terminal', resolveNextOrderStatus('delivered', 'cancelled'), null);
check('cancelled is terminal', resolveNextOrderStatus('cancelled', 'delivered'), null);

// Forward-only logistics status
check('null → PENDING', shouldApplyLogisticsStatus(null, 'PENDING'), true);
check('IN_TRANSIT → PICKED_UP ignored', shouldApplyLogisticsStatus('IN_TRANSIT', 'PICKED_UP'), false);
check('duplicate ignored', shouldApplyLogisticsStatus('IN_TRANSIT', 'IN_TRANSIT'), false);
check('DELIVERED → IN_TRANSIT ignored', shouldApplyLogisticsStatus('DELIVERED', 'IN_TRANSIT'), false);
check('FAILED_DELIVERY → RETURNED allowed', shouldApplyLogisticsStatus('FAILED_DELIVERY', 'RETURNED'), true);
check('OUT_FOR_DELIVERY → FAILED_DELIVERY allowed', shouldApplyLogisticsStatus('OUT_FOR_DELIVERY', 'FAILED_DELIVERY'), true);

// Outbound payload shape (Phase 4)
const payload = buildAgriAgentPayload({
  _id: { toString: () => '665f1c2b9a1e4b0012345678' },
  orderNumber: 'ORD-TEST-0001',
  status: 'pending',
  buyer: { _id: 'b1', name: 'Asha', mobile: '9876543210' },
  farmer: { _id: 'f1', name: 'Ramesh', mobile: '9123456780', address: 'Hunsur Road, Mysuru' },
  items: [{ product: { _id: 'p1', name: 'Tomato', category: 'vegetables' }, quantity: 5, unit: 'kg', price: 30 }],
  totalAmount: 150,
  shippingAddress: { address: '12 MG Road', city: 'Mysuru', state: 'Karnataka', pincode: '570001', country: 'India' },
  estimatedDelivery: new Date('2026-10-01T00:00:00Z'),
  paymentStatus: 'pending',
  paymentMethod: 'cash',
  escrowStatus: 'locked',
});
const required = [
  'externalOrderId', 'orderNumber', 'orderStatus', 'buyerName', 'buyerPhone',
  'farmerName', 'farmerPhone', 'pickupAddress', 'products', 'shippingAddress',
  'estimatedDelivery', 'priority',
];
check('payload has all logistics fields', required.filter((k) => !(k in payload)), []);
const leaked = (obj: any): string[] =>
  Object.entries(obj || {}).flatMap(([k, v]) => [
    ...(NON_LOGISTICS_FIELDS.includes(k) ? [k] : []),
    ...(v && typeof v === 'object' ? leaked(v) : []),
  ]);
check('no business data leaves MongoDB (ids, prices, payment, escrow)', leaked(payload), []);
check('perishable → HIGH priority', payload.priority, 'HIGH');
check('externalOrderId = Mongo _id', payload.externalOrderId, '665f1c2b9a1e4b0012345678');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
