// offline-handler.js
class OfflineFormHandler {
  constructor() {
    this.dbName = "FormSubmissionsDB";
    this.dbVersion = 1;
    this.storeName = "submissions";
    this.db = null;
    this.isOnline = navigator.onLine;

    this.initDB();
    this.setupEventListeners();
    this.startSyncInterval();
  }

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("IndexedDB initialized successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });

          // Create indexes for better querying
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("formId", "formId", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("syncStatus", "syncStatus", { unique: false });
        }
      };
    });
  }

  // Setup online/offline event listeners
  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("Connection restored - syncing pending submissions");
      this.syncPendingSubmissions();
      this.showNotification("Connection restored. Syncing data...", "info");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("Connection lost - switching to offline mode");
      this.showNotification(
        "You are offline. Form submissions will be saved locally.",
        "warning"
      );
    });
  }

  // Save form submission to IndexedDB
  async saveSubmission(formData, formConfig) {
    try {
      const submission = {
        timestamp: new Date().toISOString(),
        formId: formConfig.id || "unknown",
        formPath: formConfig.action || "",
        data: formData,
        syncStatus: "pending",
        attempts: 0,
        lastAttempt: null,
        redirectUrl: formConfig.redirectUrl || "",
        thankYouMsg: formConfig.thankYouMsg || "",
      };

      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.add(submission);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log("Submission saved to IndexedDB with ID:", request.result);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("Failed to save submission:", request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error("Error saving submission:", error);
      throw error;
    }
  }

  // Get all pending submissions
  async getPendingSubmissions() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("syncStatus");
      const request = index.getAll("pending");

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Update submission status
  async updateSubmissionStatus(id, status, error = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const submission = getRequest.result;
        if (submission) {
          submission.syncStatus = status;
          submission.lastAttempt = new Date().toISOString();
          submission.attempts += 1;

          if (error) {
            submission.error = error;
          }

          const updateRequest = store.put(submission);

          updateRequest.onsuccess = () => {
            resolve(submission);
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error("Submission not found"));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  // Sync pending submissions when online
  async syncPendingSubmissions() {
    if (!this.isOnline) {
      console.log("Cannot sync - offline");
      return;
    }

    try {
      const pendingSubmissions = await this.getPendingSubmissions();
      console.log(
        `Found ${pendingSubmissions.length} pending submissions to sync`
      );

      for (const submission of pendingSubmissions) {
        try {
          await this.submitToServer(submission);
          await this.updateSubmissionStatus(submission.id, "synced");
          console.log(`Successfully synced submission ${submission.id}`);
        } catch (error) {
          console.error(`Failed to sync submission ${submission.id}:`, error);

          // Mark as failed after multiple attempts
          if (submission.attempts >= 3) {
            await this.updateSubmissionStatus(
              submission.id,
              "failed",
              error.message
            );
          }
        }
      }

      if (pendingSubmissions.length > 0) {
        this.showNotification(
          `Successfully synced ${pendingSubmissions.length} form(s)`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error during sync:", error);
    }
  }

  // Submit form data to server
  async submitToServer(submission) {
    const response = await fetch(submission.formPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: submission.data }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return response.json();
  }

  // Clear old synced submissions (optional cleanup)
  async clearSyncedSubmissions(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("syncStatus");
      const request = index.openCursor(IDBKeyRange.only("synced"));

      const deletedIds = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const submission = cursor.value;
          if (new Date(submission.timestamp) < cutoffDate) {
            cursor.delete();
            deletedIds.push(submission.id);
          }
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedIds.length} old submissions`);
          resolve(deletedIds);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get submission statistics
  async getStatistics() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const submissions = request.result;
        const stats = {
          total: submissions.length,
          pending: submissions.filter((s) => s.syncStatus === "pending").length,
          synced: submissions.filter((s) => s.syncStatus === "synced").length,
          failed: submissions.filter((s) => s.syncStatus === "failed").length,
        };
        resolve(stats);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Show user notifications
  showNotification(message, type = "info") {
    // Create notification element if it doesn't exist
    let notification = document.getElementById("offline-notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.id = "offline-notification";
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        transition: opacity 0.3s ease;
        max-width: 300px;
      `;
      document.body.appendChild(notification);
    }

    // Set notification style based on type
    const styles = {
      info: "background: #2196F3; color: white;",
      success: "background: #4CAF50; color: white;",
      warning: "background: #FF9800; color: white;",
      error: "background: #F44336; color: white;",
    };

    notification.style.cssText += styles[type] || styles.info;
    notification.textContent = message;
    notification.style.display = "block";
    notification.style.opacity = "1";

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        notification.style.display = "none";
      }, 300);
    }, 5000);
  }

  // Start periodic sync (every 30 seconds when online)
  startSyncInterval() {
    setInterval(() => {
      if (this.isOnline) {
        this.syncPendingSubmissions();
      }
    }, 30000); // 30 seconds
  }

  // Export submissions as JSON (for backup)
  async exportSubmissions() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const data = JSON.stringify(request.result, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `form-submissions-${new Date().toISOString()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Initialize the offline handler
const offlineHandler = new OfflineFormHandler();

export default offlineHandler;
