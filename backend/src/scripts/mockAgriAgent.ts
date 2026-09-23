/**
 * Stand-in for the real Agri Agent, for local testing.
 *
 *   npm run mock:agri-agent
 *
 * - Accepts POST /api/integration/orders (what the marketplace sends)
 * - With MOCK_AUTO_SIMULATE=true, plays a full delivery lifecycle back to
 *   MARKETPLACE_CALLBACK_URL (default http://localhost:5000/api/integration/order-status)
 */
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.MOCK_AGRI_AGENT_PORT || 4000);
const API_KEY = process.env.AGRI_AGENT_API_KEY || '';
const CALLBACK_URL =
  process.env.MARKETPLACE_CALLBACK_URL || 'http://localhost:5000/api/integration/order-status';
const AUTO = process.env.MOCK_AUTO_SIMULATE === 'true';
const STEP_MS = Number(process.env.MOCK_STEP_MS || 5000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const lifecycle = [
  { logisticsStatus: 'PICKUP_ASSIGNED', lat: 12.3052, lng: 76.6552 },
  { logisticsStatus: 'ACCEPTED', lat: 12.3052, lng: 76.6552 },
  { logisticsStatus: 'PICKED_UP', lat: 12.2958, lng: 76.6394 },
  { logisticsStatus: 'IN_TRANSIT', lat: 12.3106, lng: 76.6512 },
  { logisticsStatus: 'OUT_FOR_DELIVERY', lat: 12.3181, lng: 76.6618 },
  { logisticsStatus: 'DELIVERED', lat: 12.3203, lng: 76.6644 },
];

const simulate = async (externalOrderId: string) => {
  for (const step of lifecycle) {
    await sleep(STEP_MS);
    const now = new Date().toISOString();
    const res = await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify({
        externalOrderId,
        logisticsStatus: step.logisticsStatus,
        driver: { id: 'drv_101', name: 'Manjunath K', phone: '9845012345' },
        vehicle: { number: 'KA-09-AB-1234', type: 'Tata Ace' },
        currentLocation: { latitude: step.lat, longitude: step.lng, updatedAt: now },
        trackingEvents: [
          { status: step.logisticsStatus, timestamp: now, latitude: step.lat, longitude: step.lng },
        ],
      }),
    });
    console.log(`[mock] ${externalOrderId} → ${step.logisticsStatus}: HTTP ${res.status}`);
  }
};

http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const key = req.headers['x-api-key'];
      if (API_KEY && key !== API_KEY) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Bad API key' }));
        return;
      }
      if (req.method === 'POST' && req.url?.startsWith('/api/integration/orders')) {
        const body = JSON.parse(raw || '{}');
        console.log('[mock] Order received:', JSON.stringify(body, null, 2));
        const trackingId = `AGRI-${String(body.orderNumber || Date.now()).slice(-8)}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, trackingId, deliveryProvider: 'agri-agent' }));
        if (AUTO && body.externalOrderId && body.orderStatus !== 'cancelled') {
          simulate(body.externalOrderId).catch((e) => console.error('[mock] simulate error', e));
        }
        return;
      }
      res.writeHead(404);
      res.end();
    });
  })
  .listen(PORT, () => {
    console.log(`🧪 Mock Agri Agent on http://localhost:${PORT} (auto-simulate: ${AUTO})`);
  });
