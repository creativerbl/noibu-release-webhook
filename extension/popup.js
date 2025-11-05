const domainValueEl = document.getElementById("domain-value");
const domainHelpEl = document.getElementById("domain-help");
const releaseForm = document.getElementById("release-form");
const submitButton = document.getElementById("submit-button");
const messageEl = document.getElementById("message");
const releaseTimeInput = document.getElementById("release-time");

let detectedDomainId = null;

setDefaultReleaseTime();
detectDomainFromActiveTab();

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!detectedDomainId) {
    return;
  }

  const payload = buildPayload();
  const confirmation = window.confirm(
    `Send release notification to ${detectedDomainId}?\n\n` +
      `Component: ${payload.component}\n` +
      `Title: ${payload.title}\n` +
      `Description: ${payload.description}\n` +
      `Status: ${payload.status}\n` +
      `Version: ${payload.version}\n` +
      `Release Time: ${payload.release_time}`
  );

  if (!confirmation) {
    return;
  }

  setMessage("Sending release…");
  submitButton.disabled = true;

  try {
    const response = await fetch(
      `https://webhook.noibu.com/release_webhook/${detectedDomainId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }

    setMessage("Release notification sent successfully.", "success");
    releaseForm.reset();
    setDefaultReleaseTime();
  } catch (error) {
    setMessage(error.message || "Failed to send release notification.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

function setDefaultReleaseTime() {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  releaseTimeInput.value = localTime.toISOString().slice(0, 16);
}

function detectDomainFromActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [tab] = tabs;
    if (!tab || !tab.url) {
      updateDomainDisplay(
        "Unavailable",
        "Open the extension while viewing your Noibu console project page.",
        true
      );
      return;
    }

    const domainId = extractDomainId(tab.url);
    if (!domainId) {
      updateDomainDisplay(
        "Not detected",
        "Navigate to https://console.noibu.com/<domain-id>/… and try again.",
        true
      );
      return;
    }

    detectedDomainId = domainId;
    updateDomainDisplay(domainId, "The form will post to this domain ID.");
    submitButton.disabled = false;
  });
}

function extractDomainId(url) {
  const match = url.match(/https:\/\/console\.noibu\.com\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : null;
}

function buildPayload() {
  const component = releaseForm.component.value.trim();
  const title = releaseForm.title.value.trim();
  const description = releaseForm.description.value.trim();
  const status = releaseForm.status.value;
  const version = releaseForm.version.value.trim();
  const releaseTime = releaseForm["release-time"].value;

  return {
    component,
    title,
    description,
    status,
    version,
    release_time: formatWithTimezone(releaseTime),
  };
}

function formatWithTimezone(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (num) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.classList.remove("message--error", "message--success");

  if (type === "error") {
    messageEl.classList.add("message--error");
  } else if (type === "success") {
    messageEl.classList.add("message--success");
  }
}

function updateDomainDisplay(value, help, isError = false) {
  domainValueEl.textContent = value;
  domainHelpEl.textContent = help;

  if (isError) {
    domainValueEl.classList.add("message--error");
    submitButton.disabled = true;
  } else {
    domainValueEl.classList.remove("message--error");
  }
}
