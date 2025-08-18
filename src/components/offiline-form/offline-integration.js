/**
 * Integration module to connect offline support with AEM Forms
 * This integrates with your existing form.js and submit.js
 */

import OfflineFormManager from "./offline-manager.js";
import { handleSubmit as originalHandleSubmit } from "./submit.js";

class OfflineFormIntegration {
  constructor() {
    this.offlineManager = new OfflineFormManager();
    this.initializeIntegration();
  }

  /**
   * Initialize offline integration with forms
   */
  initializeIntegration() {
    // Add offline indicator to page
    this.addOfflineIndicator();

    // Monitor connection status
    this.monitorConnectionStatus();

    // Add auto-save functionality
    this.enableAutoSave();
  }

  /**
   * Enhance form with offline capabilities
   */
  enhanceForm(form, formDef) {
    const formId = formDef.id || form.dataset.id;
    const actionUrl = form.dataset.action || formDef.action;

    // Add offline submit handler
    this.interceptFormSubmit(form, formId, actionUrl);

    // Load draft if exists
    this.loadDraftIfExists(form, formId);

    // Add draft save button
    this.addDraftControls(form, formId);

    // Handle file inputs for offline storage
    this.handleFileInputs(form);

    // Add sync status indicator
    this.addSyncStatusIndicator(form);
  }

  /**
   * Intercept form submission for offline handling
   */
  interceptFormSubmit(form, formId, actionUrl) {
    const originalSubmitHandler = form.onsubmit;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);

      // Check if online
      if (!navigator.onLine) {
        // Store submission offline
        try {
          const submissionId = await this.offlineManager.storeSubmission(
            formData,
            formId,
            actionUrl
          );

          // Store file attachments
          const fileInputs = form.querySelectorAll('input[type="file"]');
          for (const input of fileInputs) {
            if (input.files.length > 0) {
              for (const file of input.files) {
                await this.offlineManager.storeAttachment(
                  file,
                  input.name,
                  submissionId
                );
              }
            }
          }

          // Show success message
          this.showOfflineSubmitSuccess(form);

          // Clear form if configured
          if (form.dataset.clearOnSubmit !== "false") {
            form.reset();
          }
        } catch (error) {
          console.error("Failed to store offline submission:", error);
          this.showOfflineSubmitError(form);
        }
      } else {
        // Online - use original submit handler
        if (originalSubmitHandler) {
          originalSubmitHandler.call(form, event);
        } else {
          // Fallback to original handleSubmit
          originalHandleSubmit(event, form);
        }
      }
    });
  }

  /**
   * Load draft if exists
   */
  async loadDraftIfExists(form, formId) {
    try {
      const draftData = await this.offlineManager.loadDraft(formId);

      if (draftData) {
        const loadDraft = confirm(
          "A saved draft was found. Would you like to load it?"
        );

        if (loadDraft) {
          this.populateFormFromDraft(form, draftData);
          this.showNotification("Draft loaded successfully", "success");
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  }

  /**
   * Populate form fields from draft data
   */
  populateFormFromDraft(form, draftData) {
    for (const [key, value] of Object.entries(draftData)) {
      const field = form.elements[key];

      if (field) {
        if (field.type === "checkbox" || field.type === "radio") {
          if (field.length) {
            // Multiple checkboxes/radios with same name
            for (let i = 0; i < field.length; i++) {
              if (Array.isArray(value)) {
                field[i].checked = value.includes(field[i].value);
              } else {
                field[i].checked = field[i].value === value;
              }
            }
          } else {
            field.checked = value === "true" || value === true;
          }
        } else if (field.type === "select-multiple") {
          const values = Array.isArray(value) ? value : [value];
          for (let i = 0; i < field.options.length; i++) {
            field.options[i].selected = values.includes(field.options[i].value);
          }
        } else {
          field.value = value;
        }
      }
    }
  }

  /**
   * Add draft controls to form
   */
  addDraftControls(form, formId) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "offline-draft-controls";
    controlsContainer.style.cssText = `
      margin: 20px 0;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    // Save draft button
    const saveDraftBtn = document.createElement("button");
    saveDraftBtn.type = "button";
    saveDraftBtn.textContent = "Save Draft";
    saveDraftBtn.className = "button draft-save-btn";
    saveDraftBtn.style.cssText = `
      padding: 8px 16px;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    saveDraftBtn.addEventListener("click", async () => {
      const formData = new FormData(form);
      try {
        await this.offlineManager.saveDraft(formId, formData);
        this.showNotification("Draft saved", "success");
      } catch (error) {
        console.error("Failed to save draft:", error);
        this.showNotification("Failed to save draft", "error");
      }
    });

    // Clear draft button
    const clearDraftBtn = document.createElement("button");
    clearDraftBtn.type = "button";
    clearDraftBtn.textContent = "Clear Draft";
    clearDraftBtn.className = "button draft-clear-btn";
    clearDraftBtn.style.cssText = `
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    clearDraftBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear the saved draft?")) {
        form.reset();
        this.showNotification("Draft cleared", "info");
      }
    });

    // Auto-save indicator
    const autoSaveIndicator = document.createElement("span");
    autoSaveIndicator.className = "auto-save-indicator";
    autoSaveIndicator.style.cssText = `
      margin-left: auto;
      font-size: 14px;
      color: #666;
    `;

    controlsContainer.appendChild(saveDraftBtn);
    controlsContainer.appendChild(clearDraftBtn);
    controlsContainer.appendChild(autoSaveIndicator);

    // Insert controls after form title or at the beginning
    const formTitle = form.querySelector("h1, h2, .form-title");
    if (formTitle) {
      formTitle.insertAdjacentElement("afterend", controlsContainer);
    } else {
      form.insertAdjacentElement("afterbegin", controlsContainer);
    }
  }

  /**
   * Enable auto-save functionality
   */
  enableAutoSave() {
    let autoSaveTimeout;
    const AUTO_SAVE_DELAY = 30000; // 30 seconds

    document.addEventListener("input", (event) => {
      const form = event.target.closest("form");
      if (!form || !form.dataset.action) return;

      const formId = form.dataset.id;
      const autoSaveIndicator = form.querySelector(".auto-save-indicator");

      // Clear existing timeout
      clearTimeout(autoSaveTimeout);

      // Show saving indicator
      if (autoSaveIndicator) {
        autoSaveIndicator.textContent = "Changes detected...";
      }

      // Set new timeout for auto-save
      autoSaveTimeout = setTimeout(async () => {
        const formData = new FormData(form);
        try {
          await this.offlineManager.saveDraft(formId, formData);
          if (autoSaveIndicator) {
            autoSaveIndicator.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
          }
        } catch (error) {
          console.error("Auto-save failed:", error);
          if (autoSaveIndicator) {
            autoSaveIndicator.textContent = "Auto-save failed";
          }
        }
      }, AUTO_SAVE_DELAY);
    });
  }

  /**
   * Handle file inputs for offline storage
   */
  handleFileInputs(form) {
    const fileInputs = form.querySelectorAll('input[type="file"]');

    fileInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        const files = event.target.files;
        const maxSize = input.dataset.maxFileSize || 10485760; // 10MB default

        for (const file of files) {
          if (file.size > maxSize) {
            this.showNotification(
              `File ${file.name} exceeds maximum size for offline storage`,
              "warning"
            );
          }
        }
      });
    });
  }

  /**
   * Add sync status indicator to form
   */
  addSyncStatusIndicator(form) {
    const indicator = document.createElement("div");
    indicator.className = "sync-status-indicator";
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background: ${navigator.onLine ? "#4CAF50" : "#ff9800"};
      color: white;
      border-radius: 15px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
    `;

    const statusDot = document.createElement("span");
    statusDot.style.cssText = `
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: ${navigator.onLine ? "none" : "pulse 2s infinite"};
    `;

    const statusText = document.createElement("span");
    statusText.textContent = navigator.onLine ? "Online" : "Offline";

    indicator.appendChild(statusDot);
    indicator.appendChild(statusText);

    form.style.position = "relative";
    form.appendChild(indicator);

    // Update indicator on connection change
    window.addEventListener("online", () => {
      indicator.style.background = "#4CAF50";
      statusText.textContent = "Online";
      statusDot.style.animation = "none";
    });

    window.addEventListener("offline", () => {
      indicator.style.background = "#ff9800";
      statusText.textContent = "Offline";
      statusDot.style.animation = "pulse 2s infinite";
    });
  }

  /**
   * Add offline indicator to page
   */
  addOfflineIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "offline-indicator";
    indicator.textContent = "📵 Working Offline";
    document.body.appendChild(indicator);
  }

  /**
   * Monitor connection status
   */
  monitorConnectionStatus() {
    const updateIndicator = () => {
      const indicator = document.querySelector(".offline-indicator");
      if (indicator) {
        indicator.classList.toggle("active", !navigator.onLine);
      }
    };

    window.addEventListener("online", updateIndicator);
    window.addEventListener("offline", updateIndicator);
    updateIndicator();
  }

  /**
   * Show offline submit success message
   */
  showOfflineSubmitSuccess(form) {
    const message = document.createElement("div");
    message.className = "offline-submit-message success";
    message.innerHTML = `
      <h3>✓ Form Saved Offline</h3>
      <p>Your submission has been saved and will be sent when you're back online.</p>
      <button type="button" class="close-btn">Close</button>
    `;
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      text-align: center;
      z-index: 10001;
      max-width: 400px;
    `;

    const closeBtn = message.querySelector(".close-btn");
    closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    closeBtn.addEventListener("click", () => message.remove());
    document.body.appendChild(message);
  }

  /**
   * Show offline submit error message
   */
  showOfflineSubmitError(form) {
    const message = document.createElement("div");
    message.className = "offline-submit-message error";
    message.innerHTML = `
      <h3>❌ Save Failed</h3>
      <p>Unable to save your submission offline. Please try again.</p>
      <button type="button" class="close-btn">Close</button>
    `;
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      text-align: center;
      z-index: 10001;
      max-width: 400px;
    `;

    const closeBtn = message.querySelector(".close-btn");
    closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 10px 20px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;

    closeBtn.addEventListener("click", () => message.remove());
    document.body.appendChild(message);
  }

  /**
   * Show notification
   */
  showNotification(message, type = "info", duration = 3000) {
    this.offlineManager.showNotification(message, type, duration);
  }
}

// Additional CSS for animations
const additionalStyles = document.createElement("style");
additionalStyles.textContent = `
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
  
  .offline-draft-controls button:hover {
    opacity: 0.9;
  }
  
  .offline-submit-message h3 {
    margin: 0 0 15px 0;
    font-size: 20px;
  }
  
  .offline-submit-message p {
    margin: 0;
    color: #666;
  }
`;
document.head.appendChild(additionalStyles);

// Export the integration
export default OfflineFormIntegration;
