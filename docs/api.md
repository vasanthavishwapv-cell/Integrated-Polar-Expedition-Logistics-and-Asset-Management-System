# POLARIS API Specification

## 1. Global Standard Response Envelope

All API endpoints strictly conform to the standard POLARIS response envelope:

### Success Response (2xx)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-25T17:30:00.000Z",
    "requestId": "uuid"
  }
}
```

### Error Response (4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human readable error description",
    "details": null
  },
  "meta": {
    "timestamp": "2026-09-25T17:30:00.000Z",
    "requestId": "uuid"
  }
}
```

---

## 2. Authentication Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Login with email/password, returns access token + httpOnly refresh cookie | Public |
| `POST` | `/api/v1/auth/refresh` | Silent refresh using httpOnly cookie | Public (with cookie) |
| `POST` | `/api/v1/auth/logout` | Revokes refresh token cookie | Authenticated |
| `GET` | `/api/v1/auth/me` | Fetch active profile and permissions | Authenticated |
| `POST` | `/api/v1/auth/register` | Register new user | Admin |

---

## 3. Expeditions

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/expeditions` | List expeditions (filters: status, station, type) | Read-All |
| `POST` | `/api/v1/expeditions` | Create new expedition | Coordinator, Admin |
| `GET` | `/api/v1/expeditions/:id` | Get detailed expedition by ID | Read-All |
| `PATCH` | `/api/v1/expeditions/:id` | Update expedition status/details | Coordinator, Admin |
| `DELETE` | `/api/v1/expeditions/:id` | Delete draft expedition | Coordinator, Admin |

---

## 4. Shipments & Cargo

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/shipments` | List all cargo shipments | Read-All |
| `POST` | `/api/v1/shipments` | Create new shipment manifest | Logistics, Admin |
| `GET` | `/api/v1/shipments/:id` | Get shipment details with cargo items | Read-All |
| `PATCH` | `/api/v1/shipments/:id` | Update transit status or vessel location | Logistics, Admin |
| `POST` | `/api/v1/shipments/:id/receive` | Reconcile received cargo into station inventory | Logistics, Inventory, Admin |

---

## 5. Inventory & Warehouse Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/inventory` | List station inventory items with stock levels | Read-All |
| `POST` | `/api/v1/inventory` | Create new inventory catalog item | Inventory, Admin |
| `GET` | `/api/v1/inventory/:id` | Get item details with transaction history | Read-All |
| `PATCH` | `/api/v1/inventory/:id` | Update reorder thresholds or details | Inventory, Admin |
| `POST` | `/api/v1/inventory/:id/transaction` | Post stock inbound/outbound/consumption/loss | Inventory, Admin |

---

## 6. Intelligence & Alerts

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/intelligence/forecast/:id` | Calculate consumption rate & days-to-depletion | Read-All |
| `GET` | `/api/v1/intelligence/priority-scores` | Compute composite logistics priority scores | Read-All |
| `GET` | `/api/v1/alerts` | List active polar operational alerts | Read-All |
| `POST` | `/api/v1/alerts/:id/acknowledge` | Acknowledge active alert | Coordinator, Emergency, Admin |
| `POST` | `/api/v1/alerts/:id/resolve` | Mark alert resolved | Coordinator, Emergency, Admin |
| `POST` | `/api/v1/alerts/run-check` | Force on-demand anomaly & alert scan | Admin, Ops |

---

## 7. Emergency Incidents

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/incidents` | List active and historical incidents | Read-All |
| `POST` | `/api/v1/incidents` | Report new emergency / SAR incident | Emergency, Coordinator, Admin |
| `GET` | `/api/v1/incidents/:id` | Incident detail & response timeline | Read-All |
| `PATCH` | `/api/v1/incidents/:id` | Update incident status or resolution notes | Emergency, Admin |
