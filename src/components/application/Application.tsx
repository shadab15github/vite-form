import React, { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import "./Application.css";

// Types declarations
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfPurchase: string;
  productModal: string;
}

interface StoredData extends FormData {
  id?: number;
  name?: string;
  purchasedDate?: string;
}

// Encryption key
const ENCRYPTION_KEY = "my-encryption-key";

// IndexedDB config
const DB_NAME = "ApplicationDB";
const DB_VERSION = 1;
const STORE_NAME = "applications";

// Open DB
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Encrypt form data
const encrypt = (data: FormData): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

// Decrypt data
const decrypt = (encryptedData: string): FormData => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Add encrypted data to IndexedDB
const addToDatabase = async (data: FormData): Promise<number> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      encryptedData: encrypt(data),
      timestamp: new Date().toISOString(),
    });

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

// Get all decrypted data
const getAllFromDatabase = async (): Promise<StoredData[]> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result.map((record) => {
        const decrypted = decrypt(record.encryptedData);
        return {
          ...decrypted,
          id: record.id,
          name: `${decrypted.firstName} ${decrypted.lastName}`,
          purchasedDate: decrypted.dateOfPurchase,
        } as StoredData;
      });
      resolve(records);
    };

    request.onerror = () => reject(request.error);
  });
};

// Main Component
const Application: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    dateOfPurchase: "",
    productModal: "",
  });

  const [storeData, setStoreData] = useState<StoredData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAllFromDatabase();
      setStoreData(data);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addToDatabase(formData);
      console.log("Form submitted:", formData);

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        dateOfPurchase: "",
        productModal: "",
      });

      await loadData();
    } catch (err) {
      console.error("Failed to save data:", err);
    }
  };

  return (
    <div className="application-container">
      <div className="form-section">
        <h2 className="form-title">Application Form</h2>
        <form onSubmit={handleSubmit} className="application-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Address"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="postalCode">Postal Code</label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Postal Code"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dateOfPurchase">Date Of Purchase</label>
              <input
                type="date"
                id="dateOfPurchase"
                name="dateOfPurchase"
                value={formData.dateOfPurchase}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="productModal">Product Modal Number</label>
              <input
                type="text"
                id="productModal"
                name="productModal"
                value={formData.productModal}
                onChange={handleChange}
                placeholder="Product Modal Number"
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-button">
            Submit Now
          </button>
        </form>
      </div>

      <div className="data-section">
        <h2 className="data-title">Stored Data</h2>
        <div className="data-cards">
          {storeData.map((item, index) => (
            <div key={item.id || index} className="data-card">
              <div className="data-item">
                <span className="data-label">Name:</span> {item.name}
              </div>
              <div className="data-item">
                <span className="data-label">Email:</span> {item.email}
              </div>
              <div className="data-item">
                <span className="data-label">Address:</span> {item.address},{" "}
                {item.city}, {item.state} {item.postalCode}
              </div>
              <div className="data-item">
                <span className="data-label">Purchased Date:</span>{" "}
                {item.purchasedDate}
              </div>
              <div className="data-item">
                <span className="data-label">Product Modal:</span>{" "}
                {item.productModal}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Application;
