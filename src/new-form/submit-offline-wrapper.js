// submit-offline-wrapper.js
// This wraps your existing submit.js to add offline capabilities

import {
  submitSuccess,
  submitFailure,
  handleSubmit as originalHandleSubmit,
} from "./submit.js";
import { DEFAULT_THANK_YOU_MESSAGE } from "./constant.js";
import offlineHandler from "./offline-handler.js";

// Enhanced submit success with offline support
export function submitSuccessOffline(e, form, isOffline = false) {
  if (isOffline) {
    // Handle offline success differently
    const thankYouMsg = form.dataset.thankYouMsg;
    let thankYouMessage = form.parentNode.querySelector(
      ".form-message.success-message"
    );
    if (!thankYouMessage) {
      thankYouMessage = document.createElement("div");
      thankYouMessage.className = "form-message success-message";
    }

    thankYouMessage.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        ${
          thankYouMsg ||
          "Form saved offline. It will be submitted when connection is restored."
        }
      </div>
    `;
    thankYouMessage.style.background = "#FF9800";

    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: "smooth" });
    }

    form.reset();
    form.setAttribute("data-submitting", "false");
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
  } else {
    // Use original success handler for online submissions
    submitSuccess(e, form);
  }
}

// Wrapper for the submit function to add offline support
export async function handleSubmitWithOffline(e, form, captcha) {
  e.preventDefault();
  const valid = form.checkValidity();

  if (valid) {
    const submitBtn = e.submitter;
    if (submitBtn) submitBtn.setAttribute("disabled", "");

    if (form.getAttribute("data-submitting") !== "true") {
      form.setAttribute("data-submitting", "true");
      form
        .querySelectorAll(".form-message.show")
        .forEach((el) => el.classList.remove("show"));

      // Check if we're offline
      if (!navigator.onLine) {
        // Save to IndexedDB for offline storage
        try {
          const formData = new FormData(form);
          const data = {};
          for (let [key, value] of formData.entries()) {
            data[key] = value;
          }

          const formConfig = {
            id: form.dataset.id,
            action: form.dataset.action,
            redirectUrl: form.dataset.redirectUrl,
            thankYouMsg: form.dataset.thankYouMsg,
          };

          await offlineHandler.saveSubmission(data, formConfig);
          submitSuccessOffline({ payload: { body: formConfig } }, form, true);
          displayOfflineStatus(form);
          return;
        } catch (error) {
          console.error("Failed to save offline:", error);
          submitFailure(error, form);
          return;
        }
      }

      // Try original submit if online
      try {
        await originalHandleSubmit(e, form, captcha);
      } catch (error) {
        // If submission fails due to network error, save offline
        if (!navigator.onLine) {
          try {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
              data[key] = value;
            }

            const formConfig = {
              id: form.dataset.id,
              action: form.dataset.action,
              redirectUrl: form.dataset.redirectUrl,
              thankYouMsg: form.dataset.thankYouMsg,
            };

            await offlineHandler.saveSubmission(data, formConfig);
            submitSuccessOffline({ payload: { body: formConfig } }, form, true);
            displayOfflineStatus(form);
          } catch (saveError) {
            console.error("Failed to save offline:", saveError);
            submitFailure(error, form);
          }
        } else {
          throw error;
        }
      }

      // Check and sync any pending submissions after successful submission
      if (navigator.onLine) {
        setTimeout(() => {
          offlineHandler.syncPendingSubmissions();
        }, 1000);
      }
    }
  } else {
    const firstInvalidEl = form.querySelector(".invalid:not(fieldset)");
    if (firstInvalidEl) {
      firstInvalidEl.focus();
      firstInvalidEl.scrollIntoView({ behavior: "smooth" });
    }
  }
}

// Display offline status indicator
function displayOfflineStatus(form) {
  // Remove existing status if any
  const existingStatus = document.getElementById("offline-status-indicator");
  if (existingStatus) {
    existingStatus.remove();
  }

  // Create status indicator
  const statusIndicator = document.createElement("div");
  statusIndicator.id = "offline-status-indicator";
  statusIndicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #FF9800;
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1000;
    cursor: pointer;
  `;

  // Add click handler to show statistics
  statusIndicator.onclick = async () => {
    const stats = await offlineHandler.getStatistics();
    alert(`Offline Form Statistics:\n
Total Submissions: ${stats.total}
Pending: ${stats.pending}
Synced: ${stats.synced}
Failed: ${stats.failed}`);
  };

  // Update status indicator periodically
  const updateStatus = async () => {
    const stats = await offlineHandler.getStatistics();
    statusIndicator.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
      </svg>
      <span>${stats.pending} form(s) pending sync</span>
    `;

    if (stats.pending === 0) {
      setTimeout(() => {
        statusIndicator.style.opacity = "0";
        setTimeout(() => statusIndicator.remove(), 300);
      }, 3000);
    }
  };

  updateStatus();
  document.body.appendChild(statusIndicator);

  // Update every 5 seconds if there are pending submissions
  const interval = setInterval(async () => {
    const stats = await offlineHandler.getStatistics();
    if (stats.pending > 0) {
      updateStatus();
    } else {
      clearInterval(interval);
    }
  }, 5000);
}

// Export the wrapped submit handler
export { handleSubmitWithOffline as handleSubmit };
