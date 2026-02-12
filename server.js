const express = require("express");
const { exec } = require("child_process");
const cors = require("cors");
const Database = require("better-sqlite3");
const rateLimit = require("express-rate-limit");


const app = express();
const createStoreLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 store creations per minute
  message: {
    message: "Too many store creation attempts. Please try again later."
  }
});

app.use(cors());
app.use(express.json());

const db = new Database("./stores.db");

// Create table
db.prepare(`
  CREATE TABLE IF NOT EXISTS stores (
    name TEXT PRIMARY KEY,
    namespace TEXT,
    status TEXT,
    url TEXT,
    adminUser TEXT,
    adminPassword TEXT,
    createdAt TEXT
  )
`).run();

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr || err);
      else resolve(stdout);
    });
  });
}

async function applyNamespaceGuards(namespace) {
  await runCommand(`
    kubectl apply -n ${namespace} -f k8s-templates/resource-quota.yaml
  `);

  await runCommand(`
    kubectl apply -n ${namespace} -f k8s-templates/limit-range.yaml
  `);
}



function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

function allQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function generatePassword(length = 12) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

app.post("/create-store",createStoreLimiter, async (req, res) => {
  const { engine } = req.body;
if(engine && engine !="woocommerce"){
return res.status(400).json({ message: "only woocommerce supported"});
}
  const storeId = Date.now();
  const storeName = `store-${storeId}`;
  const namespace = `ns-${storeName}`;
  const createdAt = new Date().toISOString();
  const url = `http://${storeName}.localhost`;
  const adminUser = "admin";
  const adminPassword = generatePassword();

  try {
    // Insert into DB
    runQuery(
      `INSERT INTO stores (name, namespace, status, url, adminUser, adminPassword, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [storeName, namespace, "Provisioning", url, adminUser, adminPassword, createdAt]
    );

    // Respond immediately
    res.json({
      name: storeName,
      namespace,
      status: "Provisioning",
      url,
      adminUser,
      adminPassword
    });

      await deployWordpress(storeName, namespace, adminUser, adminPassword);

    // Mark ready
    runQuery(
      `UPDATE stores SET status=? WHERE name=?`,
      ["Ready", storeName]
    );

  } catch (err) {
    console.error("Provisioning failed:", err);
    runQuery(
      `UPDATE stores SET status=? WHERE name=?`,
      ["Failed", storeName]
    );
  }
});

async function deployWordpress(storeName, namespace, adminUser, adminPassword) {
  await runCommand(`
    helm install ${storeName} ./wordpress \
      --namespace ${namespace} \
      --create-namespace \
      -f helm-values/values-local.yaml \
      --set ingress.hostname=${storeName}.localhost \
      --set wordpressPassword=${adminPassword} \
      --set wordpressBlogName=${storeName}
  `);
await applyNamespaceGuards(namespace);

  await runCommand(`
    kubectl rollout status statefulset/${storeName}-mariadb \
    -n ${namespace} --timeout=600s
  `);

  await runCommand(`
    kubectl rollout status deployment/${storeName}-wordpress \
    -n ${namespace} --timeout=600s
  `);

  await runCommand(`
    kubectl wait --for=condition=ready pod \
    -l app.kubernetes.io/name=wordpress \
    -n ${namespace} --timeout=600s
  `);

  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp plugin install woocommerce --activate --allow-root
    `);

    const output = await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp post create \
      --post_type=product \
      --post_title="Demo Product" \
      --post_status=publish \
      --porcelain \
      --allow-root
    `);

    const productId = output.trim();

    await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp post meta update ${productId} _regular_price 49.99 --allow-root
    `);

    await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp post meta update ${productId} _price 49.99 --allow-root
    `);

    await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp post meta update ${productId} _stock_status instock --allow-root
    `);

    await runCommand(`
      kubectl exec -n ${namespace} deploy/${storeName}-wordpress -- \
      wp option update woocommerce_cod_settings \
      '{"enabled":"yes","title":"Cash on Delivery","description":"Pay with cash upon delivery."}' \
      --format=json --allow-root
    `);

  } catch (err) {
    console.log("WooCommerce setup skipped:", err);
  }
}


async function deployMedusa(storeName, namespace) {
  const host = `${storeName}.localhost`;

  await runCommand(`kubectl create namespace ${namespace}`);
await applyNamespaceGuards(namespace);
  await runCommand(`
    kubectl apply -n ${namespace} -f medusa-chart/postgres.yaml
  `);

  await runCommand(`
    kubectl apply -n ${namespace} -f medusa-chart/medusa.yaml
  `);

  // Wait for Postgres
  await runCommand(`
    kubectl rollout status deployment/postgres \
    -n ${namespace} --timeout=600s
  `);

  // Wait for Medusa deployment
  await runCommand(`
    kubectl rollout status deployment/medusa \
    -n ${namespace} --timeout=600s
  `);

  // Wait until pod ready
  await runCommand(`
    kubectl wait --for=condition=ready pod \
    -l app=medusa \
    -n ${namespace} --timeout=600s
  `);

  // Create ingress only AFTER ready
  await runCommand(`
    kubectl apply -n ${namespace} -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: medusa-ingress
spec:
  ingressClassName: traefik
  rules:
  - host: ${host}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: medusa
            port:
              number: 80
EOF
  `);
}



app.get("/stores", (req, res) => {
  try {
    const rows = allQuery(`SELECT * FROM stores`);
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.delete("/store/:name", async (req, res) => {
  const storeName = req.params.name;

  try {
    const rows = allQuery(
      `SELECT * FROM stores WHERE name=?`,
      [storeName]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Store not found" });

    const store = rows[0];

    try {
      await runCommand(`helm uninstall ${store.name} -n ${store.namespace}`);
    } catch {}

    try {
      await runCommand(`kubectl delete namespace ${store.namespace}`);
    } catch {}

    runQuery(`DELETE FROM stores WHERE name=?`, [storeName]);

    res.json({ message: "Deleted" });

  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
