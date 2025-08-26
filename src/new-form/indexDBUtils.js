// indexDBUtils.js

const DB_NAME = "OfflineForm";
const DB_VERSION = 1;
const STORE_NAME = "formData";

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create indexes for querying
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
        objectStore.createIndex("formId", "formId", { unique: false });
        objectStore.createIndex("status", "status", { unique: false });
      }
    };
  });
}

export async function saveFormData(formData) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const dataToSave = {
      ...formData,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    const request = store.add(dataToSave);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to save form data to IndexedDB"));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error("Error saving to IndexedDB:", error);
    throw error;
  }
}
