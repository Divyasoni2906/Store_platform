# Store Provisioning Platform  
## Kubernetes-Native Multi-Tenant WooCommerce Orchestration (Local → Production)

A **multi-tenant store provisioning platform** that dynamically provisions fully isolated WooCommerce stores on Kubernetes using Helm.

This project demonstrates:

- Kubernetes-native orchestration  
- Namespace isolation  
- Production guardrails  
- Clean lifecycle management  
- Local-to-production portability  

---

# 📌 Features

- ✅ Dynamic store provisioning  
- ✅ Namespace-per-store isolation  
- ✅ Helm-based deployment  
- ✅ Persistent MariaDB per store  
- ✅ Ingress exposure via Traefik  
- ✅ ResourceQuota & LimitRange per namespace  
- ✅ Rate limiting (5 store creations/min per IP)  
- ✅ Failure reporting with clear status  
- ✅ Clean teardown (Helm uninstall + namespace delete)  
- ✅ End-to-end WooCommerce checkout (COD enabled)

---

# 🏗 System Architecture

## 1️⃣ Dashboard (React + Vite)

- Displays all stores and their status:
  - `Provisioning`
  - `Ready`
  - `Failed`
- Create & delete stores
- Shows credentials only when store is **Ready**
- Polls backend only during provisioning phase

---

## 2️⃣ Backend (Node.js + Express)

- Orchestrates provisioning via:
  - `Helm`
  - `kubectl`
- Stores state in SQLite (`better-sqlite3`)
- Applies rate limiting
- Handles failure reporting
- Manages full lifecycle of each store

---

## 3️⃣ Kubernetes Layer (k3d)

Each store runs inside a dedicated namespace containing:

- WordPress Deployment  
- MariaDB StatefulSet  
- Dedicated PVC  
- Dedicated Ingress host  

---

# 🔁 Provisioning Flow

1. User clicks **Create Store**
2. Backend performs:

   - Validates engine (WooCommerce)
   - Inserts DB record (`Provisioning`)
   - Creates namespace
   - Applies ResourceQuota & LimitRange
   - Installs Helm chart
   - Waits for rollout readiness
   - Installs WooCommerce via WP-CLI
   - Creates demo product
   - Enables Cash on Delivery
   - Verifies checkout flow

3. Status updated to **Ready**
4. Store URL + credentials displayed in dashboard

---

# 🧩 Multi-Tenant Isolation Strategy

Each store receives:

- Its own namespace  
- Its own database  
- Independent persistent storage  
- Independent resource limits  
- Independent lifecycle management  

### Why namespace-per-store?

✔ Strong isolation  
✔ Clean blast-radius containment  
✔ Guaranteed teardown  

**Tradeoff:**  
Higher Kubernetes object count.

---

# 🛡 Production Guardrails

## ✅ ResourceQuota (Per Namespace)

Limits:

- 2 CPU cores  
- 2Gi memory  
- 2Gi persistent storage  

Prevents cluster resource exhaustion.

---

## ✅ LimitRange

Default per container:

- 250m CPU request  
- 256Mi memory request  
- 500m CPU limit  
- 512Mi memory limit  

Prevents noisy-neighbor behavior.

---

## ✅ Rate Limiting

- 5 store creations per minute per IP  

Prevents provisioning abuse.

---

# 🔐 Secret Handling

- Admin password generated per store  
- No hardcoded credentials  
- Credentials shown only when status = `Ready`  
- Database secrets handled via Helm templates  

---

# 🗑 Clean Teardown

Deleting a store triggers:

```bash
helm uninstall <store>
kubectl delete namespace <store-namespace>
```

Namespace deletion ensures removal of:

- Pods  
- PVCs  
- Secrets  
- Services  
- Ingress  

No orphaned resources remain.

---

# 🌍 Local Setup Instructions

## 1️⃣ Start Kubernetes (k3d)

```bash
k3d cluster create dev-cluster
```

---

## 2️⃣ Start Backend

```bash
cd store-platform
node server.js
```

---

## 3️⃣ Start Dashboard

```bash
cd dashboard
npm install
npm run dev
```

---

## 4️⃣ Create Store

Open dashboard → Click **Create Store**

Access via:

```
http://store-xxxx.localhost
```

Add to cart → Checkout → Verify order in admin panel.

---

# 🌎 Production-Like Setup (k3s on VPS)

1. Install k3s on VPS  
2. Configure DNS (`store.example.com`)  
3. Use production values file:

```bash
helm install store1 ./wordpress -f helm-values/values-prod.yaml
```

---

## Production Differences

Handled via `values-prod.yaml`:

- Real DNS  
- Production storage class  
- Higher resource limits  
- TLS via cert-manager  
- Replace SQLite with Postgres  

No chart logic changes required.

---

# 🔄 Upgrade & Rollback

## Upgrade

```bash
helm upgrade store1 ./wordpress -f helm-values/values-prod.yaml
```

## Rollback

```bash
helm rollback store1 1
```

Helm revision history preserves previous states.

---

# 🧠 System Design & Tradeoffs

## Architecture Choice

Control-plane style orchestration:

- React UI  
- Node backend (imperative orchestration)  
- Helm for execution  

Helm chosen over a full Kubernetes Operator for:

- Faster iteration  
- Simpler development model  

**Tradeoff:**  
Imperative model instead of declarative reconciliation loop.

---

## Idempotency & Failure Handling

- Status stored as:
  - `Provisioning`
  - `Ready`
  - `Failed`
- Explicit rollout checks
- Timeout handling
- Errors surfaced to dashboard
  
---

Medusa scaffolding exists but is disabled for production stability.

---

# 📈 Scaling Strategy

### Current

- Sequential Helm provisioning  
- SQLite state store  

### Production Improvements

- Replace SQLite with Postgres  
- Add job queue for provisioning  
- Concurrency control  
- Horizontal scaling of API layer  

---

# 🎯 Definition of Done

A store is marked **Ready** only when:

- WordPress pod is ready  
- MariaDB is ready  
- WooCommerce installed  
- Demo product exists  
- COD enabled  
- Order placement verified end-to-end  

---

# 🏁 Conclusion

This platform demonstrates:

- Kubernetes-native provisioning  
- Multi-tenant namespace isolation  
- Resource guardrails  
- Helm-based reproducibility  
- Clean lifecycle management  
- Local-to-production portability  

Designed for operational correctness, extensibility, and production readiness.
