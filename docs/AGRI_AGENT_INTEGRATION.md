# Agri Agent Logistics Integration

Farm Marketplace (MongoDB Atlas) stays the **source of truth** for users, products,
orders, payments, escrow and reviews. Agri Agent (Supabase) owns delivery partners,
vehicles, pickups, GPS and delivery events. The two systems talk **only over HTTP**.
There is no shared database and no shared code.

## Data boundaries

```
 MongoDB Atlas (Farm Marketplace)             Supabase (Agri Agent)
 ────────────────────────────────             ─────────────────────
 users, products, orders, payments,           drivers, vehicles, routing, GPS,
 escrow, reviews, tracking history,           deliveries, delivery events,
 notifications, analytics                     delivery analytics
            │                                            ▲
            │  OUT: logistics fields only                │
            └── externalOrderId, orderNumber, orderStatus,
                pickup contact + address, drop contact + address,
                package (name, qty, unit, category), ETA,
                priority, delivery notes ───────────────┘
            ┌── IN: logisticsStatus, driver, vehicle,
            │       trackingEvents, currentLocation, ETA
            ▼
 stored on the existing Order document as extra logistics fields
```

- **Never sent:** user, farmer or product IDs, prices, totals, payment status or method, escrow,
  wallet addresses, reviews, or timestamps of internal records. `NON_LOGISTICS_FIELDS` in
  `logisticsIntegrationService.ts` lists them, and `npm run test:logistics` fails if any leak.
- **MongoDB schema:** existing fields are unchanged. The only additions are optional logistics fields
  on `Order` (`assignedDriver`, `vehicle`, `trackingId`, `deliveryProvider`, `deliveryPartnerId`,
  `logisticsStatus`, `syncStatus`, `syncError`, `syncAttempts`, `lastSyncAttempt`, `lastLogisticsUpdate`,
  `deliveryEvents`, `currentLocation`), plus the value `'logistics'` in `cancelledBy`.
- **Business decisions stay here:** Agri Agent only reports what happened (e.g. `DELIVERED`), and
  this backend decides what that means (escrow release, marking cash orders paid, restock on failure).

## Flow

```
 Buyer places order (POST /api/orders)
        │
        ▼
 ┌────────────────────────┐   POST {AGRI_AGENT_API_URL}/api/integration/orders
 │   Farm Marketplace     │ ───────────────────────────────────────────────▶ ┌──────────────┐
 │   Express + MongoDB    │     x-api-key: AGRI_AGENT_API_KEY                 │  Agri Agent  │
 │                        │ ◀─────────────────────────────── { trackingId }   │  (Supabase)  │
 │ order.syncStatus =     │                                                   │              │
 │   SYNCED | FAILED      │                                                   │ assigns      │
 │                        │   POST /api/integration/order-status              │ driver, GPS, │
 │ verifyLogisticsWebhook │ ◀───────────────────────────────────────────────  │ events       │
 │ → map status (fwd-only)│     x-api-key: AGRI_AGENT_API_KEY                 └──────────────┘
 │ → append trackingEvents│
 │ → escrow / restock     │
 │ → Expo push (buyer +   │
 │   farmer)              │
 └───────────┬────────────┘
             │ GET /api/payments/tracking/:orderId  (+ logistics block)
             ▼
   Buyer app: track-order · Farmer app: orders · Admin: dashboard "Deliveries"
```

Re-sync triggers (all idempotent on `externalOrderId`): order created, order cancelled
by buyer/admin/farmer (only if already sent), and the admin endpoint
`POST /api/integration/orders/:id/sync`. Payment events are **not** synced, because payment
data never leaves MongoDB.

**Agri Agent must upsert on `externalOrderId`.** The same order may be POSTed more
than once (for example after payment, or with `orderStatus: "cancelled"`).

## Environment (backend/.env)

| Variable | Required | Purpose |
|---|---|---|
| `AGRI_AGENT_API_URL` | yes | Agri Agent base URL, no trailing slash |
| `AGRI_AGENT_API_KEY` | yes | Shared secret, used both directions |
| `AGRI_AGENT_ORDER_PATH` | no | Default `/api/integration/orders` |
| `AGRI_AGENT_CALLBACK_URL` | no | Sent to Agri Agent as `callbackUrl` |
| `AGRI_AGENT_TIMEOUT_MS` | no | Default `10000` |

Without URL and key, orders are still created normally. They get `syncStatus: FAILED`,
and the callback endpoint returns 503.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/integration/order-status` | API key | Agri Agent status callback |
| GET | `/api/integration/health` | API key | Agri Agent checks URL + key |
| POST | `/api/integration/orders/:id/sync` | JWT admin | Retry a failed sync |
| GET | `/api/integration/metrics` | JWT admin | Delivery metrics |
| GET | `/api/payments/tracking/:orderId` | JWT | Existing endpoint, now also returns `tracking.logistics` |
| GET | `/api/admin/analytics` | JWT admin | Existing endpoint, now also returns `analytics.delivery` |

The API key is accepted as `x-api-key: <key>` or `Authorization: Bearer <key>`.

## Status mapping (marketplace status only moves forward)

| Agri Agent | Marketplace | Push |
|---|---|---|
| PENDING | pending | — |
| PICKUP_ASSIGNED / ACCEPTED | accepted | Driver Assigned (once) |
| PICKED_UP | packed | Picked Up |
| IN_TRANSIT | shipped | — |
| OUT_FOR_DELIVERY | shipped | Out For Delivery |
| DELIVERED | delivered (+ escrow release / mark paid) | Delivered |
| CANCELLED / FAILED_DELIVERY / RETURNED | cancelled (+ restock, escrow refund) | Cancelled / Failed / Returned |

Late or duplicate callbacks never move an order backwards. `delivered` and
`cancelled` are final. Replayed events are de-duplicated on status + timestamp + message.
Stale GPS pings (older `updatedAt`) are ignored.

Aliases accepted: `DRIVER_ASSIGNED`, `CANCELED`, `in transit`, `out-for-delivery`, …

## Callback responses

`200` `{ success, order: { status, previousStatus, logisticsStatus, statusApplied, eventsAdded } }`
· `400` bad id / unknown status · `401` bad key · `404` unknown order · `503` key not configured.

Sample payloads: [`agri-agent-samples/`](./agri-agent-samples).

## Testing

```bash
cd backend
npm run test:logistics          # status mapping + payload shape (no DB)
npm run test:logistics:flow     # full HTTP flow with stubbed DB (no Atlas writes)
```

### Manual end-to-end (local)

1. In `backend/.env` set `AGRI_AGENT_API_URL=http://localhost:4000` and an `AGRI_AGENT_API_KEY`.
2. Terminal A: `npm run dev` (backend on :5000).
3. Terminal B: `MOCK_AUTO_SIMULATE=true npm run mock:agri-agent`
   (PowerShell: `$env:MOCK_AUTO_SIMULATE="true"; npm run mock:agri-agent`).
4. Place an order from the buyer app. Terminal B prints the received payload, then plays
   PICKUP_ASSIGNED → … → DELIVERED every 5 s.
5. Buyer › Orders › Track: the Delivery Partner card fills in with driver, phone, vehicle, ETA
   and location, and the timeline grows. Farmer › Orders shows the 4-step delivery bar.
   Admin dashboard › Deliveries counts change. Pushes arrive on real devices.
6. Replay against a specific order: `npm run simulate:logistics -- <orderId> delivered|failed|driver`.
7. curl:
   ```bash
   curl -X POST http://localhost:5000/api/integration/order-status \
     -H "Content-Type: application/json" -H "x-api-key: $AGRI_AGENT_API_KEY" \
     -d @../docs/agri-agent-samples/03-callback-driver-assigned.json
   ```
   (Replace `externalOrderId` with a real order `_id` first.)
8. Failed sync: stop the mock, place an order, and it shows `syncStatus: FAILED`. Start the mock,
   then `POST /api/integration/orders/<id>/sync` with an admin token.

## Connecting to the real Agri Agent

The Agri Agent side is in the `Major-Project-Agent` repo (Supabase Edge Functions
`ingest-marketplace-order` + `marketplace-callback-worker`, migration `014`); see its
`docs/MARKETPLACE_INTEGRATION.md`.

```env
AGRI_AGENT_API_URL=https://<PROJECT_REF>.supabase.co
AGRI_AGENT_ORDER_PATH=/functions/v1/ingest-marketplace-order
AGRI_AGENT_API_KEY=<same value as MARKETPLACE_API_KEY in Supabase secrets>
```

On the Agri side, `MARKETPLACE_API_URL` must be this backend's public URL (for example an ngrok
URL during development), because Supabase has to reach `/api/integration/order-status`.
`localhost` will not work.

