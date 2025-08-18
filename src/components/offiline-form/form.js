// Add these imports at the top of your form.js file

import OfflineFormIntegration from "./offline-integration.js";

// ... (keep all your existing imports and code)

// Initialize offline support
const offlineIntegration = new OfflineFormIntegration();

// Update the createForm function to include offline support
export async function createForm(formDef, data) {
  const { action: formPath } = formDef;
  const form = document.createElement("form");
  form.dataset.action = formPath;
  form.noValidate = true;
  if (formDef.appliedCssClassNames) {
    form.className = formDef.appliedCssClassNames;
  }
  const formId = extractIdFromUrl(formPath);
  await generateFormRendition(formDef, form, formId);

  let captcha;
  if (captchaField) {
    let config = captchaField?.properties?.["fd:captcha"]?.config;
    if (!config) {
      config = {
        siteKey: captchaField?.value,
        uri: captchaField?.uri,
        version: captchaField?.version,
      };
    }
    const pageName = getSitePageName(captchaField?.properties?.["fd:path"]);
    captcha = new GoogleReCaptcha(
      config,
      captchaField.id,
      captchaField.name,
      pageName
    );
    captcha.loadCaptcha(form);
  }

  enableValidation(form);
  transferRepeatableDOM(form);

  // ADD OFFLINE SUPPORT HERE
  offlineIntegration.enhanceForm(form, formDef);

  if (afModule && typeof Worker === "undefined") {
    window.setTimeout(async () => {
      afModule.loadRuleEngine(
        formDef,
        form,
        captcha,
        generateFormRendition,
        data
      );
    }, DELAY_MS);
  }

  form.addEventListener("reset", async () => {
    const response = await createForm(formDef);
    if (response?.form) {
      document
        .querySelector(`[data-action="${form?.dataset?.action}"]`)
        ?.replaceWith(response?.form);
    }
  });

  // UPDATE SUBMIT HANDLER to check offline status
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check if we're offline
    if (!navigator.onLine) {
      // Let offline integration handle it
      const formData = new FormData(form);
      const submissionId =
        await offlineIntegration.offlineManager.storeSubmission(
          formData,
          formId,
          formPath
        );

      // Handle file attachments
      const fileInputs = form.querySelectorAll('input[type="file"]');
      for (const input of fileInputs) {
        if (input.files.length > 0) {
          for (const file of input.files) {
            await offlineIntegration.offlineManager.storeAttachment(
              file,
              input.name,
              submissionId
            );
          }
        }
      }

      offlineIntegration.showOfflineSubmitSuccess(form);

      // Clear form if needed
      if (formDef.clearOnSubmit !== false) {
        form.reset();
      }
    } else {
      // Online - use normal submit
      handleSubmit(e, form, captcha);
    }
  });

  return {
    form,
    captcha,
    generateFormRendition,
    data,
    offlineIntegration, // Add offline integration to return object
  };
}

// Update the decorate function to support offline
export default async function decorate(block) {
  let container = block.querySelector("a[href]");
  let formDef;
  let pathname;
  if (container) {
    ({ pathname } = new URL(container.href));
    formDef = await fetchForm(container.href);
  } else {
    ({ container, formDef } = extractFormDefinition(block));
  }
  let source = "aem";
  let rules = true;
  let form;
  if (formDef) {
    const submitProps = formDef?.properties?.["fd:submit"];
    const actionType =
      submitProps?.actionName || formDef?.properties?.actionType;
    const spreadsheetUrl =
      submitProps?.spreadsheet?.spreadsheetUrl ||
      formDef?.properties?.spreadsheetUrl;

    if (actionType === "spreadsheet" && spreadsheetUrl) {
      const iframePath = window.frameElement
        ? window.parent.location.pathname
        : window.location.pathname;
      formDef.action = SUBMISSION_SERVICE + btoa(pathname || iframePath);
    } else {
      formDef.action = getSubmitBaseUrl() + (formDef.action || "");
    }

    // Add offline configuration to formDef
    formDef.offlineEnabled = true;
    formDef.autoSaveEnabled = true;
    formDef.autoSaveInterval = 30000; // 30 seconds

    if (isDocumentBasedForm(formDef)) {
      const transform = new DocBasedFormToAF();
      formDef = transform.transform(formDef);
      source = "sheet";
      const response = await createForm(formDef);
      form = response?.form;
      const docRuleEngine = await import("./rules-doc/index.js");
      docRuleEngine.default(formDef, form);
      rules = false;
    } else {
      afModule = await import("./rules/index.js");
      addRequestContextToForm(formDef);
      if (
        afModule &&
        afModule.initAdaptiveForm &&
        !block.classList.contains("edit-mode")
      ) {
        const formResponse = await afModule.initAdaptiveForm(
          formDef,
          createForm
        );
        form = formResponse.form || formResponse;
      } else {
        form = await createFormForAuthoring(formDef);
      }
    }

    form.dataset.redirectUrl = formDef.redirectUrl || "";
    form.dataset.thankYouMsg = formDef.thankYouMsg || "";
    form.dataset.action = formDef.action || pathname?.split(".json")[0];
    form.dataset.source = source;
    form.dataset.rules = rules;
    form.dataset.id = formDef.id;
    form.dataset.offlineEnabled = formDef.offlineEnabled;

    if (
      source === "aem" &&
      formDef.properties &&
      formDef.properties["fd:path"]
    ) {
      form.dataset.formpath = formDef.properties["fd:path"];
    }

    // Add offline sync status dashboard
    addOfflineDashboard(form);

    container.replaceWith(form);
  }
}

// Add offline dashboard for monitoring
function addOfflineDashboard(form) {
  const dashboard = document.createElement("div");
  dashboard.className = "offline-dashboard";
  dashboard.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    font-size: 14px;
    max-width: 250px;
    z-index: 1000;
  `;

  dashboard.innerHTML = `
    <h4 style="margin: 0 0 10px 0; font-size: 16px;">Offline Status</h4>
    <div class="status-item">
      <span>Connection:</span>
      <span class="connection-status" style="font-weight: bold; color: ${
        navigator.onLine ? "#4CAF50" : "#ff9800"
      }">
        ${navigator.onLine ? "Online" : "Offline"}
      </span>
    </div>
    <div class="status-item">
      <span>Pending Submissions:</span>
      <span class="pending-count" style="font-weight: bold;">0</span>
    </div>
    <div class="status-item">
      <span>Saved Drafts:</span>
      <span class="drafts-count" style="font-weight: bold;">0</span>
    </div>
    <button class="sync-now-btn" style="
      margin-top: 10px;
      width: 100%;
      padding: 8px;
      background: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">Sync Now</button>
    <button class="clear-data-btn" style="
      margin-top: 5px;
      width: 100%;
      padding: 8px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">Clear Offline Data</button>
  `;

  // Update stats periodically
  const updateStats = async () => {
    const stats = await offlineIntegration.offlineManager.getStorageStats();
    dashboard.querySelector(".pending-count").textContent =
      stats.pendingSubmissions || 0;
    dashboard.querySelector(".drafts-count").textContent =
      stats.formDrafts || 0;
  };

  // Update connection status
  const updateConnectionStatus = () => {
    const statusEl = dashboard.querySelector(".connection-status");
    statusEl.textContent = navigator.onLine ? "Online" : "Offline";
    statusEl.style.color = navigator.onLine ? "#4CAF50" : "#ff9800";
  };

  // Sync button handler
  dashboard
    .querySelector(".sync-now-btn")
    .addEventListener("click", async () => {
      if (navigator.onLine) {
        await offlineIntegration.offlineManager.syncPendingSubmissions();
        updateStats();
      } else {
        alert("Cannot sync while offline");
      }
    });

  // Clear data button handler
  dashboard
    .querySelector(".clear-data-btn")
    .addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear all offline data?")) {
        await offlineIntegration.offlineManager.clearOfflineData();
        updateStats();
      }
    });

  // Listen for connection changes
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  // Update stats every 5 seconds
  setInterval(updateStats, 5000);
  updateStats();

  // Only show dashboard if offline features are enabled
  if (form.dataset.offlineEnabled === "true") {
    document.body.appendChild(dashboard);
  }
}
