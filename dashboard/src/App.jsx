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
      engine: engine
    });

    fetchStores();
  } catch (err) {
    const message =
      err.response?.data?.message ||
      "Something went wrong while creating store.";

    setError(message);

    // Auto hide after 4 seconds
    setTimeout(() => {
      setError("");
    }, 4000);
  }
};


  const deleteStore = async (name) => {
    await axios.delete(`http://localhost:3001/store/${name}`);
    fetchStores();
  };

  // Initial load
  useEffect(() => {
    fetchStores();
  }, []);

  // Poll only when provisioning exists
  useEffect(() => {
    if (stores.some(s => s.status === "Provisioning")) {
      const interval = setInterval(fetchStores, 5000);
      return () => clearInterval(interval);
    }
  }, [stores]);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Store Provisioning Dashboard</h1>
{error && (
  <div
    style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      backgroundColor: "#ff4d4f",
      color: "white",
      padding: "12px 20px",
      borderRadius: "6px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
      zIndex: 1000,
      transition: "opacity 0.3s ease"
    }}
  >
    {error}
  </div>
)}


      <div style={{ marginBottom: "20px" }}>
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="woocommerce">WooCommerce</option>
          <option value="medusa">Medusa</option>
        </select>

        <button onClick={createStore}>
          Create Store
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {stores.map((store) => (
          <div
            key={store.name}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "6px"
            }}
          >
            <h3>{store.name}</h3>
            <p>Status: {store.status}</p>

            <a href={store.url} target="_blank" rel="noreferrer">
              {store.url}
            </a>

            {store.status === "Ready" && (
              <div style={{ marginTop: "10px", padding: "8px", }}>
                <p><strong>Admin User:</strong> {store.adminUser}</p>
                <p>
                  <strong>Password:</strong>{" "}
                  <code>{store.adminPassword}</code>
                </p>
              </div>
            )}

            <button
              onClick={() => deleteStore(store.name)}
              style={{
                marginTop: "10px",
                padding: "6px 12px",
                backgroundColor: "#ff4d4f",
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </ul>
    </div>
  );
}

export default App;
