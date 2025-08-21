import { DEFAULT_THANK_YOU_MESSAGE } from "./constant.js";

// IndexedDB configuration
const DB_NAME = "FormSubmissionsDB";
const DB_VERSION = 1;
const STORE_NAME = "submissions";

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("formUrl", "formUrl", { unique: false });
      }
    };
  });
}

// Save submission to IndexedDB
async function saveToIndexDB(data, url) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const submission = {
      ...data,
      formUrl: url,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    const request = store.add(submission);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error saving to IndexedDB:", error);
    throw error;
  }
}

// Get all unsynced submissions
async function getUnsyncedSubmissions() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("synced");
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting unsynced submissions:", error);
    return [];
  }
}

// Mark submission as synced
async function markAsSynced(id) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          data.syncedAt = new Date().toISOString();
          const updateRequest = store.put(data);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(false);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error("Error marking as synced:", error);
    return false;
  }
}

// Sync offline submissions when back online
async function syncOfflineSubmissions() {
  if (!navigator.onLine) return;

  const submissions = await getUnsyncedSubmissions();

  for (const submission of submissions) {
    try {
      const { id, formUrl, synced, syncedAt, timestamp, ...data } = submission;

      const response = await fetch(formUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (response.ok) {
        await markAsSynced(id);
        console.log(`Synced submission ${id}`);
      }
    } catch (error) {
      console.error(`Failed to sync submission ${submission.id}:`, error);
    }
  }
}

// Listen for online event to sync data
window.addEventListener("online", () => {
  console.log("Back online - syncing offline submissions...");
  syncOfflineSubmissions();
});

// Check and sync on page load
if (navigator.onLine) {
  syncOfflineSubmissions();
}

export function submitSuccess(e, form) {
  const { payload } = e;
  const redirectUrl = form.dataset.redirectUrl || payload.body?.redirectUrl;
  const thankYouMsg = form.dataset.thankYouMsg || payload?.body?.thankYouMsg;
  if (redirectUrl) {
    window.location.assign(encodeURI(redirectUrl));
  } else {
    let thankYouMessage = form.parentNode.querySelector(
      ".form-message.success-message"
    );
    if (!thankYouMessage) {
      thankYouMessage = document.createElement("div");
      thankYouMessage.className = "form-message success-message";
    }
    thankYouMessage.innerHTML = thankYouMsg || DEFAULT_THANK_YOU_MESSAGE;
    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: "smooth" });
    }
  }
  form.reset();
  form.setAttribute("data-submitting", "false");
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form) {
  let errorMessage = form.querySelector(".form-message.error-message");
  if (!errorMessage) {
    errorMessage = document.createElement("div");
    errorMessage.className = "form-message error-message";
  }
  errorMessage.innerHTML = "Some error occured while submitting the form"; // TODO: translation
  form.prepend(errorMessage);

  errorMessage.scrollIntoView({ behavior: "smooth" });

  form.setAttribute("data-submitting", "false");
  form.querySelector('button[type="submit"]').disabled = false;
}

// Show offline success message
function showOfflineSuccess(form) {
  let offlineMessage = form.parentNode.querySelector(
    ".form-message.offline-message"
  );
  if (!offlineMessage) {
    offlineMessage = document.createElement("div");
    offlineMessage.className = "form-message offline-message";
  }
  offlineMessage.innerHTML =
    "Your submission has been saved offline and will be sent when you're back online.";
  form.parentNode.insertBefore(offlineMessage, form);
  if (offlineMessage.scrollIntoView) {
    offlineMessage.scrollIntoView({ behavior: "smooth" });
  }

  form.reset();
  form.setAttribute("data-submitting", "false");
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function getFieldValue(fe, payload) {
  if (fe.type == "radio") {
    return fe.form.elements[fe.name].value;
  }
  if (fe.type == "checkbox") {
    if (fe.checked) {
      if (payload[fe.name]) {
        return `${payload[fe.name]},${fe.value}`;
      }
      return fe.value;
    }
    return null;
  } else if (fe.type !== "file") {
    return fe.value;
  }
  return null;
}

function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((fe) => {
    if (
      fe.name &&
      !fe.matches("button") &&
      !fe.disabled &&
      fe.tagName != "FIELDSET"
    ) {
      const value = getFieldValue(fe, payload);
      if (fe.closest(".repeat-wrapper")) {
        payload[fe.name] = payload[fe.name]
          ? `${payload[fe.name]},${fe.value}`
          : value;
      } else {
        payload[fe.name] = value;
      }
    }
  });
  return { payload };
}

async function prepareRequest(form) {
  const payload = constructPayload(form);
  const headers = {
    "Content-Type": "application/json",
  };
  const body = { data: payload };
  const url = form.dataset.submit || form.dataset.action;
  return { headers, body, url };
}

async function submitDocBasedForm(form, captcha) {
  try {
    const { headers, body, url } = await prepareRequest(form, captcha);
    let token = null;
    if (captcha) {
      token = await captcha.getToken();
      body.data["g-recaptcha-response"] = token;
    }

    // Save to IndexedDB first (always, for backup)
    await saveToIndexDB(body.data, url);

    // Check if online and try to submit
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          // Mark the latest submission as synced since it was successful
          const submissions = await getUnsyncedSubmissions();
          const latest = submissions[submissions.length - 1];
          if (latest) {
            await markAsSynced(latest.id);
          }
          submitSuccess(response, form);
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } catch (networkError) {
        // Network error but data is saved offline
        console.log("Network error, data saved offline:", networkError);
        showOfflineSuccess(form);
      }
    } else {
      // Offline - show offline success message
      showOfflineSuccess(form);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}

export async function handleSubmit(e, form, captcha) {
  e.preventDefault();
  const valid = form.checkValidity();
  if (valid) {
    e.submitter?.setAttribute("disabled", "");
    if (form.getAttribute("data-submitting") !== "true") {
      form.setAttribute("data-submitting", "true");
      form
        .querySelectorAll(".form-message.show")
        .forEach((el) => el.classList.remove("show"));

      if (form.dataset.source === "sheet") {
        await submitDocBasedForm(form, captcha);
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

// Optional: Add a function to manually trigger sync
export async function manualSync() {
  const count = (await getUnsyncedSubmissions()).length;
  if (count > 0) {
    console.log(`Syncing ${count} offline submissions...`);
    await syncOfflineSubmissions();
    return true;
  }
  return false;
}

// Optional: Get count of unsynced submissions
export async function getUnsyncedCount() {
  const submissions = await getUnsyncedSubmissions();
  return submissions.length;
}
