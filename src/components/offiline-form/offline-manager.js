class OfflineFormManager {
  constructor() {
    this.dbName = "AEMFormsOfflineDB";
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;

    // Store names
    this.STORES = {
      SUBMISSIONS: "pendingSubmissions",
      DRAFTS: "formDrafts",
      ATTACHMENTS: "fileAttachments",
      METADATA: "formMetadata",
    };

    this.init();
    this.setupEventListeners();
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    try {
      this.db = await this.openDatabase();
      console.log("IndexedDB initialized successfully");

      // Sync pending submissions if online
      if (this.isOnline) {
        await this.syncPendingSubmissions();
      }
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
    }
  }

  /**
   * Open or create IndexedDB database
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create pending submissions store
        if (!db.objectStoreNames.contains(this.STORES.SUBMISSIONS)) {
          const submissionsStore = db.createObjectStore(
            this.STORES.SUBMISSIONS,
            {
              keyPath: "id",
              autoIncrement: true,
            }
          );
          submissionsStore.createIndex("formId", "formId", { unique: false });
          submissionsStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          submissionsStore.createIndex("status", "status", { unique: false });
        }

        // Create drafts store
        if (!db.objectStoreNames.contains(this.STORES.DRAFTS)) {
          const draftsStore = db.createObjectStore(this.STORES.DRAFTS, {
            keyPath: "id",
          });
          draftsStore.createIndex("formId", "formId", { unique: false });
          draftsStore.createIndex("userId", "userId", { unique: false });
          draftsStore.createIndex("lastModified", "lastModified", {
            unique: false,
          });
        }

        // Create attachments store
        if (!db.objectStoreNames.contains(this.STORES.ATTACHMENTS)) {
          const attachmentsStore = db.createObjectStore(
            this.STORES.ATTACHMENTS,
            {
              keyPath: "id",
              autoIncrement: true,
            }
          );
          attachmentsStore.createIndex("submissionId", "submissionId", {
            unique: false,
          });
          attachmentsStore.createIndex("fieldName", "fieldName", {
            unique: false,
          });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(this.STORES.METADATA)) {
          const metadataStore = db.createObjectStore(this.STORES.METADATA, {
            keyPath: "formId",
          });
          metadataStore.createIndex("lastSync", "lastSync", { unique: false });
          metadataStore.createIndex("version", "version", { unique: false });
        }
      };
    });
  }

  /**
   * Setup online/offline event listeners
   */
  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("Connection restored - syncing pending submissions");
      this.showNotification("Connection restored", "success");
      this.syncPendingSubmissions();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("Connection lost - working offline");
      this.showNotification(
        "Working offline - submissions will be saved locally",
        "info"
      );
    });

    // Periodic sync check
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingSubmissions();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Store form submission offline
   */
  async storeSubmission(formData, formId, actionUrl) {
    try {
      const submission = {
        formId,
        actionUrl,
        data: this.serializeFormData(formData),
        timestamp: new Date().toISOString(),
        status: "pending",
        retryCount: 0,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      };

      const transaction = this.db.transaction(
        [this.STORES.SUBMISSIONS],
        "readwrite"
      );
      const store = transaction.objectStore(this.STORES.SUBMISSIONS);
      const request = store.add(submission);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log("Submission stored offline:", request.result);
          this.showNotification(
            "Form saved offline - will submit when connection is restored",
            "warning"
          );
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to store submission:", error);
      throw error;
    }
  }

  /**
   * Save form draft
   */
  async saveDraft(formId, formData, userId = "anonymous") {
    try {
      const draft = {
        id: `${formId}_${userId}`,
        formId,
        userId,
        data: this.serializeFormData(formData),
        lastModified: new Date().toISOString(),
      };

      const transaction = this.db.transaction(
        [this.STORES.DRAFTS],
        "readwrite"
      );
      const store = transaction.objectStore(this.STORES.DRAFTS);
      const request = store.put(draft);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log("Draft saved:", draft.id);
          this.showNotification("Draft saved", "success", 2000);
          resolve(draft.id);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to save draft:", error);
      throw error;
    }
  }

  /**
   * Load form draft
   */
  async loadDraft(formId, userId = "anonymous") {
    try {
      const transaction = this.db.transaction([this.STORES.DRAFTS], "readonly");
      const store = transaction.objectStore(this.STORES.DRAFTS);
      const request = store.get(`${formId}_${userId}`);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const draft = request.result;
          if (draft) {
            console.log("Draft loaded:", draft.id);
            resolve(draft.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to load draft:", error);
      return null;
    }
  }

  /**
   * Store file attachment
   */
  async storeAttachment(file, fieldName, submissionId) {
    try {
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          const attachment = {
            submissionId,
            fieldName,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            data: reader.result,
            timestamp: new Date().toISOString(),
          };

          const transaction = this.db.transaction(
            [this.STORES.ATTACHMENTS],
            "readwrite"
          );
          const store = transaction.objectStore(this.STORES.ATTACHMENTS);
          const request = store.add(attachment);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Failed to store attachment:", error);
      throw error;
    }
  }

  /**
   * Sync pending submissions when online
   */
  async syncPendingSubmissions() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log("Starting sync of pending submissions");

    try {
      const submissions = await this.getPendingSubmissions();

      for (const submission of submissions) {
        try {
          await this.submitToServer(submission);
          await this.markSubmissionComplete(submission.id);
        } catch (error) {
          await this.updateSubmissionStatus(
            submission.id,
            "failed",
            error.message
          );
          console.error(`Failed to sync submission ${submission.id}:`, error);
        }
      }

      console.log("Sync completed");
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get all pending submissions
   */
  async getPendingSubmissions() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.STORES.SUBMISSIONS],
        "readonly"
      );
      const store = transaction.objectStore(this.STORES.SUBMISSIONS);
      const index = store.index("status");
      const request = index.getAll("pending");

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Submit form data to server
   */
  async submitToServer(submission) {
    const formData = this.deserializeFormData(submission.data);

    // Get any associated attachments
    const attachments = await this.getAttachments(submission.id);
    for (const attachment of attachments) {
      const file = this.dataURLtoFile(attachment.data, attachment.fileName);
      formData.append(attachment.fieldName, file);
    }

    const response = await fetch(submission.actionUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    return response;
  }

  /**
   * Mark submission as complete
   */
  async markSubmissionComplete(submissionId) {
    const transaction = this.db.transaction(
      [this.STORES.SUBMISSIONS],
      "readwrite"
    );
    const store = transaction.objectStore(this.STORES.SUBMISSIONS);
    const request = store.get(submissionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const submission = request.result;
        submission.status = "completed";
        submission.completedAt = new Date().toISOString();

        const updateRequest = store.put(submission);
        updateRequest.onsuccess = () => {
          console.log(`Submission ${submissionId} marked as complete`);
          this.showNotification("Form submitted successfully", "success");
          resolve();
        };
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update submission status
   */
  async updateSubmissionStatus(submissionId, status, error = null) {
    const transaction = this.db.transaction(
      [this.STORES.SUBMISSIONS],
      "readwrite"
    );
    const store = transaction.objectStore(this.STORES.SUBMISSIONS);
    const request = store.get(submissionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const submission = request.result;
        submission.status = status;
        submission.lastError = error;
        submission.retryCount++;
        submission.lastRetry = new Date().toISOString();

        const updateRequest = store.put(submission);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get attachments for a submission
   */
  async getAttachments(submissionId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.STORES.ATTACHMENTS],
        "readonly"
      );
      const store = transaction.objectStore(this.STORES.ATTACHMENTS);
      const index = store.index("submissionId");
      const request = index.getAll(submissionId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Serialize FormData for storage
   */
  serializeFormData(formData) {
    const serialized = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Skip files - they're stored separately
        continue;
      }
      if (serialized[key]) {
        if (!Array.isArray(serialized[key])) {
          serialized[key] = [serialized[key]];
        }
        serialized[key].push(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  /**
   * Deserialize stored data back to FormData
   */
  deserializeFormData(data) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(key, v));
      } else {
        formData.append(key, value);
      }
    }
    return formData;
  }

  /**
   * Convert data URL to File object
   */
  dataURLtoFile(dataURL, filename) {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `offline-notification offline-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${
        type === "success"
          ? "#4CAF50"
          : type === "warning"
          ? "#ff9800"
          : type === "error"
          ? "#f44336"
          : "#2196F3"
      };
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData() {
    const stores = Object.values(this.STORES);
    const transaction = this.db.transaction(stores, "readwrite");

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await store.clear();
    }

    console.log("All offline data cleared");
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    const stats = {};

    for (const [name, storeName] of Object.entries(this.STORES)) {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      stats[name] = await new Promise((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
      });
    }

    return stats;
  }
}

// CSS for notifications
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .offline-indicator {
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 8px 16px;
    background: #ff9800;
    color: white;
    border-radius: 20px;
    font-size: 14px;
    z-index: 9999;
    display: none;
  }
  
  .offline-indicator.active {
    display: block;
  }
`;
document.head.appendChild(style);

// Export the offline manager
export default OfflineFormManager;
