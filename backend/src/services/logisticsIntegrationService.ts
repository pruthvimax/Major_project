/**
 * Logistics Integration Service — Farm Marketplace ⇄ Agri Agent
 *
 * MongoDB (this app) stays the source of truth for orders, payments and
 * escrow. Agri Agent (Supabase) owns drivers, vehicles, pickups and GPS.
 * The two talk only over HTTP:
 *
 *   Marketplace ──POST {AGRI_AGENT_API_URL}{AGRI_AGENT_ORDER_PATH}──▶ Agri Agent
 *   Agri Agent  ──POST /api/integration/order-status──────────────▶ Marketplace
 *
 * Nothing here throws into the order flow: sync failures are recorded on the
 * order (syncStatus = FAILED) and can be retried by an admin.
 */
import mongoose from 'mongoose';
import Order, {
  IOrder,
  LogisticsStatus,
  LOGISTICS_STATUSES,
  OrderStatus,
} from '../models/Order';
import Product from '../models/Product';
import { releaseEscrow, refundEscrow } from './escrowService';
import { sendPushNotification } from './notificationService';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const DEFAULT_ORDER_PATH = '/api/integration/orders';
const DEFAULT_PROVIDER = 'agri-agent';
const MAX_EVENTS_PER_CALLBACK = 50;
const PERISHABLE_CATEGORIES = ['vegetables', 'fruits', 'dairy', 'meat', 'poultry'];

const getConfig = () => ({
  apiUrl: (process.env.AGRI_AGENT_API_URL || '').replace(/\/+$/, ''),
  apiKey: process.env.AGRI_AGENT_API_KEY || '',
  orderPath: process.env.AGRI_AGENT_ORDER_PATH || DEFAULT_ORDER_PATH,
  callbackUrl: process.env.AGRI_AGENT_CALLBACK_URL || '',
  timeoutMs: Number(process.env.AGRI_AGENT_TIMEOUT_MS) || 10000,
});

export const isLogisticsIntegrationConfigured = (): boolean => {
  const { apiUrl, apiKey } = getConfig();
  return Boolean(apiUrl && apiKey);
};

// ─────────────────────────────────────────────
// Status mapping (Phase 6)
// ─────────────────────────────────────────────

export const LOGISTICS_TO_ORDER_STATUS: Record<LogisticsStatus, OrderStatus> = {
  PENDING: 'pending',
  PICKUP_ASSIGNED: 'accepted',
  ACCEPTED: 'accepted',
  PICKED_UP: 'packed',
  IN_TRANSIT: 'shipped',
  OUT_FOR_DELIVERY: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED_DELIVERY: 'cancelled',
  RETURNED: 'cancelled',
};

/** Common spellings Agri Agent (or a human with curl) might send. */
const STATUS_ALIASES: Record<string, LogisticsStatus> = {
  DRIVER_ASSIGNED: 'PICKUP_ASSIGNED',
  ASSIGNED: 'PICKUP_ASSIGNED',
  PICKUP_SCHEDULED: 'PICKUP_ASSIGNED',
  PICKEDUP: 'PICKED_UP',
  INTRANSIT: 'IN_TRANSIT',
  OUTFORDELIVERY: 'OUT_FOR_DELIVERY',
  CANCELED: 'CANCELLED',
  FAILED: 'FAILED_DELIVERY',
  DELIVERY_FAILED: 'FAILED_DELIVERY',
  RETURN: 'RETURNED',
};

export const normalizeLogisticsStatus = (raw: unknown): LogisticsStatus | null => {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if ((LOGISTICS_STATUSES as string[]).includes(key)) return key as LogisticsStatus;
  return STATUS_ALIASES[key] || STATUS_ALIASES[key.replace(/_/g, '')] || null;
};

const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 4,
};

/**
 * Marketplace status only moves forward. Returns the status to apply, or
 * null when nothing should change (terminal order, or an out-of-order /
 * duplicate callback that would move the order backwards).
 */
export const resolveNextOrderStatus = (
  current: OrderStatus,
  target: OrderStatus
): OrderStatus | null => {
  if (current === 'delivered' || current === 'cancelled') return null;
  if (target === 'cancelled') return 'cancelled';
  return ORDER_STATUS_RANK[target] > ORDER_STATUS_RANK[current] ? target : null;
};

const LOGISTICS_RANK: Record<LogisticsStatus, number> = {
  PENDING: 0,
  PICKUP_ASSIGNED: 1,
  ACCEPTED: 2,
  PICKED_UP: 3,
  IN_TRANSIT: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
  CANCELLED: 6,
  FAILED_DELIVERY: 6,
  RETURNED: 7,
};

const TERMINAL_LOGISTICS: LogisticsStatus[] = ['DELIVERED', 'CANCELLED', 'FAILED_DELIVERY', 'RETURNED'];

/** Same forward-only rule for the raw logistics status. */
export const shouldApplyLogisticsStatus = (
  current: LogisticsStatus | null | undefined,
  incoming: LogisticsStatus
): boolean => {
  if (!current) return true;
  if (current === incoming) return false;
  if (TERMINAL_LOGISTICS.includes(current) && !TERMINAL_LOGISTICS.includes(incoming)) return false;
  return LOGISTICS_RANK[incoming] > LOGISTICS_RANK[current];
};

const LOGISTICS_MESSAGES: Record<LogisticsStatus, string> = {
  PENDING: 'Delivery request received by our logistics partner.',
  PICKUP_ASSIGNED: 'A delivery partner has been assigned for pickup.',
  ACCEPTED: 'The delivery partner accepted the pickup.',
  PICKED_UP: 'Your order has been picked up from the farm.',
  IN_TRANSIT: 'Your order is in transit.',
  OUT_FOR_DELIVERY: 'Your order is out for delivery.',
  DELIVERED: 'Your order has been delivered by our logistics partner.',
  CANCELLED: 'The delivery was cancelled by the logistics partner.',
  FAILED_DELIVERY: 'Delivery attempt failed.',
  RETURNED: 'The order was returned to the sender.',
};

type NotifyGroup = 'DRIVER_ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

const NOTIFY_GROUP: Partial<Record<LogisticsStatus, NotifyGroup>> = {
  PICKUP_ASSIGNED: 'DRIVER_ASSIGNED',
  ACCEPTED: 'DRIVER_ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED_DELIVERY: 'CANCELLED',
  RETURNED: 'CANCELLED',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Id of a ref that may or may not be populated. */
export const idOf = (ref: any): string => {
  if (!ref) return '';
  if (ref._id) return ref._id.toString();
  return ref.toString();
};

const str = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '';

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(v as any);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toCoord = (v: unknown, limit: number): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

const formatCoords = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// ─────────────────────────────────────────────
// Outbound: order → Agri Agent (Phase 4)
// ─────────────────────────────────────────────

export const buildAgriAgentPayload = (order: any) => {
  const buyer = order.buyer || {};
  const farmer = order.farmer || {};
  const items: any[] = order.items || [];
  const perishable = items.some((i) =>
    PERISHABLE_CATEGORIES.includes(String(i.product?.category || '').toLowerCase())
  );
  const { callbackUrl } = getConfig();
  const ship = order.shippingAddress || {};

  // LOGISTICS-ONLY payload. MongoDB Atlas stays the system of record: no user
  // / product ids, prices, totals, payment, escrow or review data leave it.
  // Contact name + phone are sent only because the driver needs them at
  // pickup and drop-off.
  return {
    externalOrderId: order._id.toString(),
    orderNumber: order.orderNumber,
    orderStatus: order.status, // lets Agri Agent stop a pickup when an order is cancelled
    // pickup (farmer) — delivery contact, not an account
    farmerName: farmer.name || '',
    farmerPhone: farmer.mobile || '',
    pickupAddress: farmer.address || '',
    // drop-off (buyer) — delivery contact, not an account
    buyerName: buyer.name || '',
    buyerPhone: buyer.mobile || '',
    shippingAddress: {
      address: ship.address || '',
      city: ship.city || '',
      state: ship.state || '',
      pincode: ship.pincode || '',
      country: ship.country || '',
    },
    // what the driver carries — names, quantities and handling category only
    products: items.map((i) => ({
      name: i.product?.name || '',
      category: i.product?.category || '',
      quantity: i.quantity,
      unit: i.unit,
    })),
    estimatedDelivery: order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString() : null,
    priority: perishable ? 'HIGH' : 'NORMAL',
    notes: order.notes || '', // delivery instructions
    ...(callbackUrl ? { callbackUrl } : {}),
  };
};

/** Fields that must never be sent to Agri Agent (checked by the tests). */
export const NON_LOGISTICS_FIELDS = [
  'buyerId', 'farmerId', 'productId', 'price', 'totalAmount',
  'paymentStatus', 'paymentMethod', 'razorpayOrderId', 'razorpayPaymentId',
  'escrowStatus', 'blockchainTxHash', 'buyerWalletAddress', 'farmerWalletAddress', 'createdAt',
];

export interface SyncResult {
  success: boolean;
  syncStatus: 'SYNCED' | 'FAILED';
  trackingId?: string;
  error?: string;
}

/**
 * Push an order to Agri Agent. Idempotent on externalOrderId — safe to call
 * again after payment, cancellation, or from the admin "resync" endpoint.
 * Uses atomic updates so it never clobbers concurrent saves on the order.
 */
export const syncOrderToAgriAgent = async (orderId: string): Promise<SyncResult> => {
  const now = new Date();
  const fail = async (error: string): Promise<SyncResult> => {
    console.warn(`[Logistics] Sync failed for order ${orderId}: ${error}`);
    await Order.updateOne(
      { _id: orderId },
      { $set: { syncStatus: 'FAILED', syncError: error.slice(0, 500), lastSyncAttempt: now }, $inc: { syncAttempts: 1 } }
    ).catch(() => undefined);
    return { success: false, syncStatus: 'FAILED', error };
  };

  try {
    const { apiUrl, apiKey, orderPath, timeoutMs } = getConfig();
    if (!apiUrl || !apiKey) {
      return await fail('AGRI_AGENT_API_URL / AGRI_AGENT_API_KEY not configured');
    }

    const order = await Order.findById(orderId)
      .populate('buyer', 'name mobile')
      .populate('farmer', 'name mobile address')
      .populate('items.product', 'name category');
    if (!order) return { success: false, syncStatus: 'FAILED', error: 'Order not found' };

    await Order.updateOne({ _id: orderId }, { $set: { syncStatus: 'PENDING' } });

    const response = await fetch(`${apiUrl}${orderPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildAgriAgentPayload(order)),
      signal: AbortSignal.timeout(timeoutMs),
    });

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || body?.success === false) {
      const msg = body?.message || body?.error || response.statusText || 'Unknown error';
      return await fail(`HTTP ${response.status}: ${String(msg)}`);
    }

    const data = body?.data || body || {};
    const $set: Record<string, unknown> = {
      syncStatus: 'SYNCED',
      syncError: '',
      lastSyncAttempt: now,
      deliveryProvider: str(data.deliveryProvider) || order.deliveryProvider || DEFAULT_PROVIDER,
    };
    const trackingId = str(data.trackingId || data.deliveryId || data.id);
    if (trackingId) $set.trackingId = trackingId;
    const partnerId = str(data.deliveryPartnerId);
    if (partnerId) $set.deliveryPartnerId = partnerId;

    await Order.updateOne({ _id: orderId }, { $set, $inc: { syncAttempts: 1 } });
    console.log(`[Logistics] Order ${order.orderNumber} synced to Agri Agent${trackingId ? ` (tracking ${trackingId})` : ''}`);
    return { success: true, syncStatus: 'SYNCED', trackingId: trackingId || undefined };
  } catch (error: any) {
    const reason = error?.name === 'TimeoutError' ? 'Request to Agri Agent timed out' : error?.message || 'Network error';
    return fail(reason);
  }
};

/** Fire-and-forget wrapper for use inside request handlers. */
export const triggerOrderSync = (orderId: string): void => {
  syncOrderToAgriAgent(orderId).catch((err) =>
    console.error('[Logistics] Unexpected sync error:', err)
  );
};

// ─────────────────────────────────────────────
// Inbound: Agri Agent status callback (Phases 5–8, 12)
// ─────────────────────────────────────────────

export interface LogisticsCallbackPayload {
  externalOrderId?: string;
  orderNumber?: string;
  logisticsStatus?: string;
  driver?: { id?: string; name?: string; phone?: string; vehicleNumber?: string };
  vehicle?: { id?: string; number?: string; vehicleNumber?: string; registrationNumber?: string; type?: string };
  trackingEvents?: Array<{
    status?: string;
    message?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  }>;
  currentLocation?: { latitude?: number; longitude?: number; updatedAt?: string };
  trackingId?: string;
  deliveryPartnerId?: string;
  deliveryProvider?: string;
  agent?: string;
  assignedAgent?: string;
  eta?: string;
  estimatedDelivery?: string;
  reason?: string;
}

export interface ApplyResult {
  httpStatus: number;
  body: Record<string, unknown>;
}

const restockItems = async (order: IOrder) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.quantity += item.quantity;
      product.isAvailable = true;
      await product.save();
    }
  }
};

export const applyLogisticsUpdate = async (payload: LogisticsCallbackPayload): Promise<ApplyResult> => {
  const externalOrderId = str(payload?.externalOrderId, 64);
  const orderNumber = str(payload?.orderNumber, 64);

  if (!externalOrderId && !orderNumber) {
    return { httpStatus: 400, body: { success: false, message: 'externalOrderId is required' } };
  }
  if (externalOrderId && !mongoose.Types.ObjectId.isValid(externalOrderId)) {
    return { httpStatus: 400, body: { success: false, message: 'externalOrderId is not a valid order id' } };
  }

  const rawStatus = payload.logisticsStatus;
  const incomingStatus = normalizeLogisticsStatus(rawStatus);
  if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '' && !incomingStatus) {
    return {
      httpStatus: 400,
      body: { success: false, message: `Unknown logisticsStatus "${String(rawStatus)}"`, allowed: LOGISTICS_STATUSES },
    };
  }

  const order = await Order.findOne(externalOrderId ? { _id: externalOrderId } : { orderNumber })
    .populate('buyer', 'email')
    .populate('farmer', 'email');
  if (!order) {
    return { httpStatus: 404, body: { success: false, message: 'Order not found' } };
  }

  const now = new Date();
  const prevLogistics = order.logisticsStatus || null;
  const prevOrderStatus = order.status;

  // ── Driver / vehicle / partner info (Phase 8) ──
  if (payload.driver && typeof payload.driver === 'object') {
    const d = payload.driver;
    order.assignedDriver = {
      id: str(d.id, 100) || order.assignedDriver?.id || '',
      name: str(d.name, 100) || order.assignedDriver?.name || '',
      phone: str(d.phone, 20) || order.assignedDriver?.phone || '',
    };
  }
  const v = payload.vehicle && typeof payload.vehicle === 'object' ? payload.vehicle : null;
  const vehicleNumber =
    str(v?.number, 30) || str(v?.vehicleNumber, 30) || str(v?.registrationNumber, 30) || str(payload.driver?.vehicleNumber, 30);
  if (v || vehicleNumber) {
    order.vehicle = {
      id: str(v?.id, 100) || order.vehicle?.id || '',
      number: vehicleNumber || order.vehicle?.number || '',
      type: str(v?.type, 50) || order.vehicle?.type || '',
    };
  }
  const agent = str(payload.assignedAgent || payload.agent, 100);
  if (agent) order.assignedAgent = agent;
  if (str(payload.trackingId, 100)) order.trackingId = str(payload.trackingId, 100);
  if (str(payload.deliveryPartnerId, 100)) order.deliveryPartnerId = str(payload.deliveryPartnerId, 100);
  order.deliveryProvider = str(payload.deliveryProvider, 50) || order.deliveryProvider || DEFAULT_PROVIDER;

  const eta = toDate(payload.eta || payload.estimatedDelivery);
  if (eta) order.estimatedDelivery = eta;

  // ── Live location (ignore stale / out-of-order pings) ──
  if (payload.currentLocation && typeof payload.currentLocation === 'object') {
    const lat = toCoord(payload.currentLocation.latitude, 90);
    const lng = toCoord(payload.currentLocation.longitude, 180);
    const at = toDate(payload.currentLocation.updatedAt) || now;
    const existingAt = order.currentLocation?.updatedAt ? new Date(order.currentLocation.updatedAt) : null;
    if (lat !== null && lng !== null && (!existingAt || at >= existingAt)) {
      order.currentLocation = { latitude: lat, longitude: lng, updatedAt: at };
    }
  }

  // ── Logistics status (forward-only) ──
  const statusChanged = Boolean(incomingStatus && shouldApplyLogisticsStatus(prevLogistics, incomingStatus));
  if (statusChanged && incomingStatus) order.logisticsStatus = incomingStatus;

  // ── Delivery events: dedupe + append (Phase 7) ──
  const existingKeys = new Set(
    (order.deliveryEvents || []).map((e) => `${e.status}|${new Date(e.timestamp).getTime()}|${e.message}`)
  );
  const incomingEvents = Array.isArray(payload.trackingEvents)
    ? payload.trackingEvents.slice(0, MAX_EVENTS_PER_CALLBACK)
    : [];

  const newEvents: Array<{ status: string; message: string; location: string; latitude?: number; longitude?: number; timestamp: Date }> = [];
  for (const raw of incomingEvents) {
    if (!raw || typeof raw !== 'object') continue;
    const evStatus = normalizeLogisticsStatus(raw.status) || str(raw.status, 40).toUpperCase() || incomingStatus || 'UPDATE';
    const lat = toCoord(raw.latitude, 90);
    const lng = toCoord(raw.longitude, 180);
    const message =
      str(raw.message, 300) || LOGISTICS_MESSAGES[evStatus as LogisticsStatus] || `Delivery update: ${evStatus}`;
    const timestamp = toDate(raw.timestamp) || now;
    const key = `${evStatus}|${timestamp.getTime()}|${message}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    newEvents.push({
      status: evStatus,
      message,
      location: str(raw.location, 200) || (lat !== null && lng !== null ? formatCoords(lat, lng) : ''),
      ...(lat !== null ? { latitude: lat } : {}),
      ...(lng !== null ? { longitude: lng } : {}),
      timestamp,
    });
  }
  // A status change with no explicit event still gets a timeline entry.
  if (statusChanged && incomingStatus && !newEvents.some((e) => e.status === incomingStatus)) {
    const driverName = order.assignedDriver?.name;
    newEvents.push({
      status: incomingStatus,
      message:
        (incomingStatus === 'PICKUP_ASSIGNED' || incomingStatus === 'ACCEPTED') && driverName
          ? `${driverName} has been assigned to deliver your order.`
          : LOGISTICS_MESSAGES[incomingStatus],
      location: order.currentLocation?.latitude != null && order.currentLocation?.longitude != null
        ? formatCoords(order.currentLocation.latitude, order.currentLocation.longitude)
        : '',
      timestamp: now,
    });
  }
  newEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const ev of newEvents) {
    order.deliveryEvents.push(ev);
    // Mirror into the existing buyer timeline using marketplace statuses so
    // the current tracking UI (colours, stepper timestamps) keeps working.
    const mapped = LOGISTICS_TO_ORDER_STATUS[ev.status as LogisticsStatus];
    order.trackingEvents.push({
      status: mapped || order.status,
      message: ev.message,
      location: ev.location,
      timestamp: ev.timestamp,
    });
  }

  // ── Marketplace order status (Phase 6, forward-only) ──
  let appliedOrderStatus: OrderStatus | null = null;
  if (statusChanged && incomingStatus) {
    appliedOrderStatus = resolveNextOrderStatus(order.status, LOGISTICS_TO_ORDER_STATUS[incomingStatus]);
  }

  if (appliedOrderStatus) {
    order.status = appliedOrderStatus;
    if (!order.statusHistory.some((h) => h.status === appliedOrderStatus)) {
      order.statusHistory.push({ status: appliedOrderStatus, timestamp: now });
    }

    if (appliedOrderStatus === 'cancelled') {
      await restockItems(order);
      order.cancellationReason =
        str(payload.reason, 300) || LOGISTICS_MESSAGES[incomingStatus as LogisticsStatus] || 'Cancelled by logistics partner';
      order.cancelledBy = 'logistics';
      order.cancelledAt = now;
      if (order.blockchainOrderId && order.escrowStatus === 'locked') {
        const refund = await refundEscrow({
          blockchainOrderId: order.blockchainOrderId,
          amount: order.totalAmount,
          userId: idOf(order.buyer),
          orderId: order._id.toString(),
          buyerEmail: (order.buyer as any)?.email || undefined,
        });
        if (refund.txHash) {
          order.blockchainTxHash = refund.txHash;
          order.escrowStatus = refund.escrowStatus;
        }
      }
    }

    if (appliedOrderStatus === 'delivered') {
      order.deliveryDate = now;
      order.verificationStatus = 'verified';
      if (order.blockchainOrderId && order.escrowStatus === 'locked') {
        const release = await releaseEscrow({
          blockchainOrderId: order.blockchainOrderId,
          amount: order.totalAmount,
          userId: idOf(order.farmer),
          orderId: order._id.toString(),
          farmerEmail: (order.farmer as any)?.email || '',
        });
        if (release.txHash) {
          order.blockchainTxHash = release.txHash;
          order.escrowStatus = release.escrowStatus;
          order.paymentStatus = 'paid';
        }
      } else if (order.paymentMethod !== 'blockchain') {
        order.paymentStatus = 'paid';
      }
    }
  }

  order.lastLogisticsUpdate = now;
  // A callback proves Agri Agent knows this order.
  if (order.syncStatus !== 'SYNCED') {
    order.syncStatus = 'SYNCED';
    order.syncError = '';
  }

  await order.save();

  // ── Push notifications (Phase 12) ──
  if (statusChanged && incomingStatus) {
    const group = NOTIFY_GROUP[incomingStatus];
    const prevGroup = prevLogistics ? NOTIFY_GROUP[prevLogistics] : undefined;
    if (group && group !== prevGroup) {
      notifyParties(order, group, incomingStatus).catch((err) =>
        console.error('[Logistics] Notification error:', err)
      );
    }
  }

  return {
    httpStatus: 200,
    body: {
      success: true,
      message: 'Order logistics updated',
      order: {
        externalOrderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        previousStatus: prevOrderStatus,
        logisticsStatus: order.logisticsStatus,
        statusApplied: statusChanged,
        eventsAdded: newEvents.length,
      },
    },
  };
};

const notifyParties = async (order: IOrder, group: NotifyGroup, status: LogisticsStatus) => {
  const buyerId = idOf(order.buyer);
  const farmerId = idOf(order.farmer);
  const ref = order.orderNumber;
  const driver = order.assignedDriver?.name ? ` (${order.assignedDriver.name})` : '';
  const vehicle = order.vehicle?.number ? `, vehicle ${order.vehicle.number}` : '';

  const messages: Record<NotifyGroup, { title: string; buyer: string; farmer: string }> = {
    DRIVER_ASSIGNED: {
      title: 'Driver Assigned 🚚',
      buyer: `A delivery partner${driver} has been assigned to your order ${ref}.`,
      farmer: `Driver${driver}${vehicle} will pick up order ${ref}. Please keep it ready.`,
    },
    PICKED_UP: {
      title: 'Order Picked Up 📦',
      buyer: `Your order ${ref} has been picked up from the farm.`,
      farmer: `Order ${ref} has been picked up by the driver${driver}.`,
    },
    OUT_FOR_DELIVERY: {
      title: 'Out for Delivery 🛵',
      buyer: `Your order ${ref} is out for delivery. It will reach you soon!`,
      farmer: `Order ${ref} is out for delivery to the buyer.`,
    },
    DELIVERED: {
      title: 'Order Delivered! 🎉',
      buyer: `Your order ${ref} has been delivered. Enjoy your fresh produce!`,
      farmer: `Order ${ref} was delivered to the buyer.`,
    },
    CANCELLED: {
      title: status === 'CANCELLED' ? 'Delivery Cancelled ❌' : status === 'RETURNED' ? 'Order Returned ↩️' : 'Delivery Failed ⚠️',
      buyer: `${LOGISTICS_MESSAGES[status]} (Order ${ref})`,
      farmer: `${LOGISTICS_MESSAGES[status]} (Order ${ref})`,
    },
  };

  const m = messages[group];
  const data = { orderId: order._id.toString(), logisticsStatus: status, type: 'logistics' };
  await Promise.all([
    buyerId ? sendPushNotification(buyerId, m.title, m.buyer, data) : Promise.resolve(false),
    farmerId ? sendPushNotification(farmerId, m.title, m.farmer, data) : Promise.resolve(false),
  ]);
};

// ─────────────────────────────────────────────
// Metrics (Phase 11)
// ─────────────────────────────────────────────

export const getDeliveryMetrics = async () => {
  const [byLogistics, bySync, failedSyncOrders] = await Promise.all([
    Order.aggregate([
      { $match: { logisticsStatus: { $ne: null } } },
      { $group: { _id: '$logisticsStatus', count: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $group: { _id: '$syncStatus', count: { $sum: 1 } } }]),
    Order.find({ syncStatus: 'FAILED' })
      .select('orderNumber syncError syncAttempts lastSyncAttempt createdAt')
      .sort({ lastSyncAttempt: -1 })
      .limit(10),
  ]);

  const l: Record<string, number> = {};
  byLogistics.forEach((r: any) => (l[r._id] = r.count));
  const s: Record<string, number> = {};
  bySync.forEach((r: any) => (s[r._id || 'NOT_SYNCED'] = r.count));

  return {
    ordersAssigned: (l.PICKUP_ASSIGNED || 0) + (l.ACCEPTED || 0),
    ordersInTransit: (l.PICKED_UP || 0) + (l.IN_TRANSIT || 0) + (l.OUT_FOR_DELIVERY || 0),
    deliveredOrders: l.DELIVERED || 0,
    failedDeliveries: (l.FAILED_DELIVERY || 0) + (l.RETURNED || 0),
    cancelledDeliveries: l.CANCELLED || 0,
    awaitingAssignment: l.PENDING || 0,
    byLogisticsStatus: l,
    sync: {
      synced: s.SYNCED || 0,
      failed: s.FAILED || 0,
      pending: s.PENDING || 0,
      notSynced: s.NOT_SYNCED || 0,
    },
    failedSyncOrders,
    integrationConfigured: isLogisticsIntegrationConfigured(),
  };
};
