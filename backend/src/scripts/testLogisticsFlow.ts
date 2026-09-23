/**
 * End-to-end flow test for the Agri Agent integration WITHOUT a database.
 *
 * Runs the real Express routes, API-key middleware, controller, service and
 * Mongoose schema validation. Only the DB reads/writes are stubbed, so this
 * never touches MongoDB Atlas.
 *
 *   npm run test:logistics:flow
 */
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import integrationRoutes from '../routes/integrationRoutes';
import { syncOrderToAgriAgent } from '../services/logisticsIntegrationService';

const KEY = 'test-agri-key';
process.env.AGRI_AGENT_API_KEY = KEY;

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean, detail?: unknown) => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? '✅' : '❌'} ${name}${cond || detail === undefined ? '' : `  → ${JSON.stringify(detail)}`}`);
};

// ── In-memory stand-ins for the DB ─────────────────────────────
const docs = new Map<string, any>();
const restocked: string[] = [];
const notified: string[] = [];
const updates: Array<{ filter: any; update: any }> = [];

const makeOrder = (overrides: Record<string, unknown> = {}) => {
  const doc: any = new Order({
    buyer: new mongoose.Types.ObjectId(),
    farmer: new mongoose.Types.ObjectId(),
    items: [{ product: new mongoose.Types.ObjectId(), quantity: 3, price: 40, unit: 'kg' }],
    totalAmount: 120,
    paymentMethod: 'cash',
    shippingAddress: { address: '12 MG Road', city: 'Mysuru', state: 'Karnataka', pincode: '570001', country: 'India' },
    statusHistory: [{ status: 'pending', timestamp: new Date() }],
    trackingEvents: [{ status: 'pending', message: 'Order placed', timestamp: new Date() }],
    ...overrides,
  });
  doc.save = async function () {
    await this.validate();
    return this;
  };
  docs.set(doc._id.toString(), doc);
  return doc;
};

const chain = (value: any) => {
  const q: any = {
    populate: () => q,
    then: (res: any, rej: any) => Promise.resolve(value).then(res, rej),
  };
  return q;
};

(Order as any).findOne = (filter: any) => chain(docs.get(String(filter._id)) || null);
(Order as any).findById = (id: any) => chain(docs.get(String(id)) || null);
(Order as any).updateOne = (filter: any, update: any) => {
  updates.push({ filter, update });
  return Promise.resolve({ acknowledged: true });
};
(Product as any).findById = async (id: any) => ({
  quantity: 0,
  isAvailable: false,
  save: async () => restocked.push(String(id)),
});
(User as any).findById = async (id: any) => {
  notified.push(String(id));
  return null; // sendPushNotification then skips the Expo call
};

// ── Server under test ──────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/integration', integrationRoutes);

const start = (server: http.Server) =>
  new Promise<string>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`))
  );

const tick = () => new Promise((r) => setTimeout(r, 50));

(async () => {
  const server = http.createServer(app);
  const base = await start(server);
  const post = async (body: unknown, key: string | null = KEY) => {
    const res = await fetch(`${base}/api/integration/order-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'x-api-key': key } : {}) },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };

  const order = makeOrder();
  const id = order._id.toString();
  const driver = { id: 'drv_101', name: 'Manjunath K', phone: '9845012345' };
  const vehicle = { number: 'KA-09-AB-1234', type: 'Tata Ace' };

  console.log('\n— Security (Phase 13)');
  check('no API key → 401', (await post({ externalOrderId: id, logisticsStatus: 'PENDING' }, null)).status === 401);
  check('wrong API key → 401', (await post({ externalOrderId: id, logisticsStatus: 'PENDING' }, 'nope')).status === 401);
  const bearer = await fetch(`${base}/api/integration/health`, { headers: { Authorization: `Bearer ${KEY}` } });
  check('Bearer key accepted on /health', bearer.status === 200);

  console.log('\n— Validation');
  check('missing externalOrderId → 400', (await post({ logisticsStatus: 'PENDING' })).status === 400);
  check('invalid externalOrderId → 400', (await post({ externalOrderId: 'abc', logisticsStatus: 'PENDING' })).status === 400);
  check('unknown order → 404', (await post({ externalOrderId: new mongoose.Types.ObjectId().toString(), logisticsStatus: 'PENDING' })).status === 404);
  check('unknown status → 400', (await post({ externalOrderId: id, logisticsStatus: 'TELEPORTED' })).status === 400);

  console.log('\n— Driver assignment (Phases 6, 8, 12)');
  const t0 = new Date(Date.now() - 60_000).toISOString();
  let r = await post({
    externalOrderId: id,
    logisticsStatus: 'PICKUP_ASSIGNED',
    driver,
    vehicle,
    trackingId: 'AGRI-TRK-1',
    eta: '2026-10-01T10:30:00.000Z',
    currentLocation: { latitude: 12.3052, longitude: 76.6552, updatedAt: t0 },
  });
  await tick();
  check('200 OK', r.status === 200, r.body);
  check('order.status pending → accepted', order.status === 'accepted', order.status);
  check('driver stored', order.assignedDriver.name === 'Manjunath K' && order.assignedDriver.phone === '9845012345');
  check('vehicle number stored', order.vehicle.number === 'KA-09-AB-1234');
  check('trackingId + ETA stored', order.trackingId === 'AGRI-TRK-1' && order.estimatedDelivery?.toISOString() === '2026-10-01T10:30:00.000Z');
  check('deliveryEvents appended', order.deliveryEvents.length === 1);
  check('trackingEvents appended (old entry kept)', order.trackingEvents.length === 2 && order.trackingEvents[0].status === 'pending');
  check('statusHistory appended', order.statusHistory.map((h: any) => h.status).join(',') === 'pending,accepted');
  check('buyer + farmer notified', notified.length === 2, notified.length);

  r = await post({ externalOrderId: id, logisticsStatus: 'ACCEPTED' });
  await tick();
  check('ACCEPTED keeps status accepted', order.status === 'accepted');
  check('no duplicate "driver assigned" push', notified.length === 2, notified.length);

  console.log('\n— In transit + idempotency (Phase 7)');
  await post({ externalOrderId: id, logisticsStatus: 'PICKED_UP' });
  await tick();
  check('PICKED_UP → packed', order.status === 'packed');
  const ev = { status: 'IN_TRANSIT', message: 'Crossed Srirangapatna', timestamp: '2026-09-30T08:00:00.000Z' };
  r = await post({ externalOrderId: id, logisticsStatus: 'IN_TRANSIT', trackingEvents: [ev] });
  check('IN_TRANSIT → shipped', order.status === 'shipped');
  const before = order.deliveryEvents.length;
  r = await post({ externalOrderId: id, logisticsStatus: 'IN_TRANSIT', trackingEvents: [ev] });
  check('replayed callback adds no events', order.deliveryEvents.length === before && r.body?.order?.eventsAdded === 0);
  r = await post({ externalOrderId: id, logisticsStatus: 'PICKED_UP' });
  check('late PICKED_UP ignored', order.status === 'shipped' && order.logisticsStatus === 'IN_TRANSIT' && r.body?.order?.statusApplied === false);

  await post({ externalOrderId: id, currentLocation: { latitude: 12.31, longitude: 76.66, updatedAt: new Date().toISOString() } });
  check('location-only update accepted', order.currentLocation.latitude === 12.31);
  await post({ externalOrderId: id, currentLocation: { latitude: 1, longitude: 1, updatedAt: t0 } });
  check('stale GPS ping ignored', order.currentLocation.latitude === 12.31);
  await post({ externalOrderId: id, currentLocation: { latitude: 999, longitude: 76 } });
  check('invalid coordinates ignored', order.currentLocation.latitude === 12.31);

  console.log('\n— Delivery completion');
  await post({ externalOrderId: id, logisticsStatus: 'OUT_FOR_DELIVERY' });
  await post({ externalOrderId: id, logisticsStatus: 'DELIVERED' });
  await tick();
  check('DELIVERED → delivered', order.status === 'delivered');
  check('cash order marked paid', order.paymentStatus === 'paid');
  check('deliveryDate set', Boolean(order.deliveryDate));
  check('pushes: assigned, picked up, out for delivery, delivered (×2 parties)', notified.length === 8, notified.length);
  await post({ externalOrderId: id, logisticsStatus: 'FAILED_DELIVERY' });
  check('delivered order cannot be cancelled by late callback', order.status === 'delivered');
  const marketplace = ['pending', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled'];
  check('all trackingEvents use marketplace statuses (UI-compatible)', order.trackingEvents.every((e: any) => marketplace.includes(e.status)));

  console.log('\n— Failed delivery → cancelled');
  const o2 = makeOrder({ status: 'shipped' });
  r = await post({ externalOrderId: o2._id.toString(), logisticsStatus: 'FAILED_DELIVERY', reason: 'Buyer unreachable' });
  check('FAILED_DELIVERY → cancelled', o2.status === 'cancelled', r.body);
  check('cancelledBy = logistics, reason kept', o2.cancelledBy === 'logistics' && o2.cancellationReason === 'Buyer unreachable');
  check('stock restored', restocked.length === 1);

  console.log('\n— Outbound sync (Phase 4)');
  let received: any = null;
  let mode: 'ok' | 'fail' = 'ok';
  const mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      received = { url: req.url, key: req.headers['x-api-key'], body: JSON.parse(raw || '{}') };
      res.writeHead(mode === 'ok' ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mode === 'ok' ? { success: true, trackingId: 'AGRI-XYZ' } : { success: false, message: 'boom' }));
    });
  });
  const mockBase = await start(mock);
  const o3 = makeOrder();
  const o3id = o3._id.toString();

  delete process.env.AGRI_AGENT_API_URL;
  let s = await syncOrderToAgriAgent(o3id);
  check('unconfigured → FAILED', !s.success && s.syncStatus === 'FAILED');

  process.env.AGRI_AGENT_API_URL = mockBase;
  updates.length = 0;
  s = await syncOrderToAgriAgent(o3id);
  const last = updates[updates.length - 1]?.update?.$set || {};
  check('sync → SYNCED', s.success && last.syncStatus === 'SYNCED' && last.trackingId === 'AGRI-XYZ', last);
  check('POSTs to /api/integration/orders with API key', received?.url === '/api/integration/orders' && received?.key === KEY);
  const need = ['externalOrderId', 'orderNumber', 'orderStatus', 'buyerName', 'buyerPhone', 'farmerName', 'farmerPhone', 'pickupAddress', 'products', 'shippingAddress', 'estimatedDelivery', 'priority'];
  check('payload contains every logistics field', need.every((k) => k in (received?.body || {})), need.filter((k) => !(k in (received?.body || {}))));
  const body = JSON.stringify(received?.body || {});
  const leaked = ['buyerId', 'farmerId', 'productId', '"price"', 'totalAmount', 'paymentStatus', 'paymentMethod', 'escrow'].filter((k) => body.includes(k));
  check('no marketplace business data in the payload', leaked.length === 0, leaked);
  check('externalOrderId is the Mongo _id', received?.body?.externalOrderId === o3id);

  mode = 'fail';
  s = await syncOrderToAgriAgent(o3id);
  check('Agri Agent 500 → FAILED with reason', !s.success && /HTTP 500/.test(s.error || ''), s);

  mock.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
