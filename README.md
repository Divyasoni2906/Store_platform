# 🚀 Store Provisioning Platform (Kubernetes + Helm)

A multi-tenant store provisioning platform that dynamically provisions isolated WooCommerce stores on Kubernetes using Helm.

This project demonstrates Kubernetes-native orchestration, namespace isolation, production guardrails, and local-to-production portability.

---

# 📌 Features

- Dynamic store provisioning
- Namespace-per-store isolation
- Helm-based deployment
- Persistent MariaDB per store
- Ingress exposure via Traefik
- ResourceQuota & LimitRange per namespace
- Rate limiting for abuse prevention
- Failure reporting with clear error visibility
- Clean teardown (Helm uninstall + namespace delete)
- End-to-end WooCommerce checkout (COD enabled)

---

# 🏗 System Architecture

## 1️⃣ Dashboard (React + Vite)

- Displays all stores and their status
- Allows store creation and deletion
- Shows admin credentials only when status = `Ready`
- Displays provisioning failures
- Polls only when provisioning exists

## 2️⃣ Backend API (Node.js + Express)

- Orchestrates provisioning using Helm and kubectl
- Stores state in SQLite (`better-sqlite3`)
- Implements rate limiting
- Stores failure reasons
- Applies Kubernetes guardrails
- Controls lifecycle of each store

## 3️⃣ Kubernetes Layer (k3d /

Each store runs inside:

- Dedicated namespace
- Dedicated WordPress deployment
- Dedicated MariaDB StatefulSet
- Dedicated PVC
- Dedicated Ingress host

---

# 🔁 Provisioning Flow

1. User clicks **Create Store**
2. Backend:
   - Validates engine (WooCommerce only in Round 1)
   - Inserts DB record (`Provisioning`)
   - Installs Helm chart in new namespace
   - Waits for rollout completion
   - Installs WooCommerce plugin
   - Creates demo product
   - Enables Cash on Delivery
3. Status updated to `Ready`
4. URL and credentials displayed

---

# 🧩 Multi-Tenant Isolation Strategy

Each store receives:

- Its own namespace
- Its own database instance
- Independent persistent storage
- Independent resource limits
- Independent lifecycle management

## Why Namespace-per-Store?

**Advantages:**

- Strong isolation
- Clean blast radius containment
- Simple full teardown
- Clear resource boundaries

**Tradeoff:**

- Higher object count in cluster

Isolation and operational clarity were prioritized over minimal object footprint.

---

# 📦 Helm Deployment Strategy

Two values files handle environment differences:

- `values-local.yaml`
- `values-prod.yaml`

### Local Example

```bash
helm install store1 ./wordpress -f helm-values/values-local.yaml
```

### Production Example

```bash
helm install store1 ./wordpress -f helm-values/values-prod.yaml
```

No chart logic changes required between environments.

---

# 🛡 Production Guardrails

## ✅ ResourceQuota (Per Namespace)

Limits:

- CPU usage
- Memory usage
- PVC count
- Object count

Prevents cluster resource exhaustion.

---

## ✅ LimitRange

Ensures:

- Default memory requests
- Enforced memory limits

Prevents noisy neighbor behavior.

---

## ✅ Rate Limiting

Applied to `/create-store` route.

- Maximum 5 store creations per minute per IP.

Prevents abuse and provisioning storms.

---

## ✅ Failure Reporting

If provisioning fails:

- Status updated to `Failed`
No silent failures.

---

# 🔐 Secret Handling

- Admin password generated per store
- No hardcoded credentials in code
- Credentials displayed only when store is `Ready`
- Database credentials handled via Helm chart

---

# 🗑 Clean Teardown

Deleting a store triggers:

1. Helm uninstall
2. Namespace deletion
3. Database status update

Namespace deletion guarantees:

- Pod cleanup
- PVC removal
- Secret removal
- Ingress removal

No orphaned resources remain.

---

# ⚙️ Scaling Strategy

## Horizontal Scaling (Platform)

Can scale independently:

- Backend API (stateless)
- Dashboard frontend
- Ingress controller

SQLite can be replaced with Postgres in production for horizontal DB scaling.

---

## Provisioning Throughput

Current approach:

- Sequential Helm invocation

Future production improvement:

- Queue-based worker model
- Controlled concurrency limits

---

# 🌍 Local-to-Production Story

## Local Environment

- k3d 
- Traefik ingress
- `*.localhost` host mapping

## Production Environment

- k3s on VPS
- Real DNS
- TLS via cert-manager
- `values-prod.yaml`

Only Helm values change. Chart remains identical.

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

# 🎯 Tradeoffs

## Why WooCommerce Only?

The assignment allows implementing one engine fully.

WooCommerce was selected because:

- Stable Helm support
- WP-CLI automation capability
- Faster provisioning stability
- Simpler operational model

Medusa scaffolding exists but is intentionally disabled for production reliability.

---

## Why SQLite?

**Pros:**

- Zero infrastructure dependency
- Simple local development

**Cons:**

- Not horizontally scalable

Production plan: Replace with Postgres.

---

# 🧪 Local Setup Instructions

1. Start k3d or k3s
2. Start backend:

```bash
node server.js
```

3. Start dashboard:

```bash
npm run dev
```

4. Create a store
5. Access via:

```
http://store-xxxx.localhost
```

---

# 📌 Definition of Done

A store is considered `Ready` only when:

- WordPress pod is ready
- MariaDB is ready
- WooCommerce is installed
- Demo product exists
- COD payment method enabled
- Ingress is reachable
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

Designed for operational correctness, extensibility, and production-readiness.
