import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [stores, setStores] = useState([]);
  const [engine, setEngine] = useState("woocommerce");
  const [error, setError] = useState("");

  const fetchStores = async () => {
    const res = await axios.get("http://localhost:3001/stores");
    setStores(res.data);
  };

  const createStore = async () => {
    try {
      await axios.post("http://localhost:3001/create-store", {
        engine: engine,
      });
      fetchStores();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong while creating store.";

      setError(message);

      setTimeout(() => {
        setError("");
      }, 4000);
    }
  };

  const deleteStore = async (name) => {
    await axios.delete(`http://localhost:3001/store/${name}`);
    fetchStores();
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (stores.some((s) => s.status === "Provisioning")) {
      const interval = setInterval(fetchStores, 5000);
      return () => clearInterval(interval);
    }
  }, [stores]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
        padding: "40px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1
          style={{
            marginBottom: "30px",
            fontSize: "28px",
            fontWeight: "600",
            color: "#1f2937",
          }}
        >
           Store Provisioning Dashboard
        </h1>

        {error && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              backgroundColor: "#ff4d4f",
              color: "white",
              padding: "12px 20px",
              borderRadius: "8px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              zIndex: 1000,
            }}
          >
            {error}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="woocommerce">WooCommerce</option>
            <option value="medusa">Medusa</option>
          </select>

          <button
            onClick={createStore}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Create Store
          </button>
        </div>

        {/* Store List */}
        {stores.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              backgroundColor: "white",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              color: "#6b7280",
            }}
          >
            No stores created yet.
          </div>
        )}

        {stores.map((store) => (
          <div
            key={store.name}
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                marginBottom: "10px",
                fontSize: "18px",
                color: "#111827",
              }}
            >
              {store.name}
            </h3>

            <p style={{ marginBottom: "6px", color: "#374151" }}>
              <strong>Status:</strong>{" "}
              <span
                style={{
                  color:
                    store.status === "Ready"
                      ? "green"
                      : store.status === "Failed"
                      ? "red"
                      : "#f59e0b",
                }}
              >
                {store.status}
              </span>
            </p>

            <a
              href={store.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginBottom: "10px",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              {store.url}
            </a>

            {store.status === "Ready" && (
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "10px",
                  borderRadius: "6px",
                  marginTop: "10px",
                }}
              >
                <p style={{ margin: "4px 0" }}>
                  <strong>Admin User:</strong> {store.adminUser}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Password:</strong>{" "}
                  <code
                    style={{
                      backgroundColor: "#e5e7eb",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {store.adminPassword}
                  </code>
                </p>
              </div>
            )}

            <button
              onClick={() => deleteStore(store.name)}
              style={{
                marginTop: "15px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#ef4444",
                color: "white",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
