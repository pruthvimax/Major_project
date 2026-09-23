/**
 * Replays Agri Agent callbacks against a running marketplace backend.
 *
 *   npm run simulate:logistics -- <orderId> [scenario]
 *
 * scenario: delivered (default) | failed | driver
 */
import dotenv from 'dotenv';

dotenv.config();

const [orderId, scenario = 'delivered'] = process.argv.slice(2);
const BASE = process.env.MARKETPLACE_CALLBACK_URL || 'http://localhost:5000/api/integration/order-status';
const API_KEY = process.env.AGRI_AGENT_API_KEY || '';

if (!orderId) {
  console.error('Usage: npm run simulate:logistics -- <orderId> [delivered|failed|driver]');
  process.exit(1);
}

const driver = { id: 'drv_101', name: 'Manjunath K', phone: '9845012345' };
const vehicle = { number: 'KA-09-AB-1234', type: 'Tata Ace' };

const scenarios: Record<string, string[]> = {
  driver: ['PICKUP_ASSIGNED'],
  delivered: ['PICKUP_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  failed: ['PICKUP_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'FAILED_DELIVERY'],
};

const post = async (body: unknown, key = API_KEY) => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  return { status: res.status, body: json };
};

(async () => {
  // Security check first: a wrong key must be rejected.
  const bad = await post({ externalOrderId: orderId, logisticsStatus: 'PENDING' }, 'wrong-key');
  console.log(`${bad.status === 401 ? '✅' : '❌'} wrong API key → HTTP ${bad.status}`);

  let lat = 12.2958;
  let lng = 76.6394;
  for (const status of scenarios[scenario] || scenarios.delivered) {
    lat += 0.004;
    lng += 0.003;
    const now = new Date().toISOString();
    const r = await post({
      externalOrderId: orderId,
      logisticsStatus: status,
      driver,
      vehicle,
      eta: new Date(Date.now() + 2 * 3600_000).toISOString(),
      currentLocation: { latitude: lat, longitude: lng, updatedAt: now },
      trackingEvents: [{ status, timestamp: now, latitude: lat, longitude: lng }],
    });
    const o = r.body?.order || {};
    console.log(`${r.status === 200 ? '✅' : '❌'} ${status.padEnd(17)} → HTTP ${r.status}  order.status=${o.status}  logistics=${o.logisticsStatus}  events+${o.eventsAdded}`);
    await new Promise((res) => setTimeout(res, 500));
  }

  // Replaying the last callback must be a no-op (idempotent).
  const again = await post({ externalOrderId: orderId, logisticsStatus: 'PICKED_UP' });
  console.log(`${again.body?.order?.statusApplied === false ? '✅' : '❌'} late/duplicate PICKED_UP ignored (statusApplied=${again.body?.order?.statusApplied})`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
