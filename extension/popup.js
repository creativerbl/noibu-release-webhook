const domainStatusEl = document.getElementById("domain-status");
const messageEl = document.getElementById("message");
const releaseForm = document.getElementById("release-form");
const submitButton = document.getElementById("submit-button");
const releaseTimeInput = document.getElementById("release-time");
const domainInput = document.getElementById("domain-id");
const detectButton = document.getElementById("detect-domain");

function setReleaseTimeDefault() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
  releaseTimeInput.value = localISOTime;
}

function extractDomainId(url) {
  const pattern = /https:\/\/console\.noibu\.com\/([0-9a-fA-F-]{36})(?:\/|$)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

function formatReleaseTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid release time");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const offsetMins = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMins}`;
}

function updateDomainStatus(status, type = "info") {
  domainStatusEl.textContent = status;
  domainStatusEl.className = `status ${type}`;
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.textContent = "";
  messageEl.className = "message";
}

function updateSubmitState() {
  submitButton.disabled = domainInput.value.trim().length === 0;
}

async function detectDomainFromActiveTab() {
  updateDomainStatus("Detecting Noibu project domain…");
  detectButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      updateDomainStatus("Unable to detect the current tab URL. Enter the domain ID manually.", "error");
      return;
    }

    const detectedDomain = extractDomainId(tab.url);
    if (!detectedDomain) {
      updateDomainStatus("Open a Noibu console project (https://console.noibu.com/<domain-id>/…) or enter the domain manually.", "error");
      return;
    }

    domainInput.value = detectedDomain;
    updateDomainStatus(`Domain detected: ${detectedDomain}`, "success");
  } catch (error) {
    console.error(error);
    updateDomainStatus("Unable to access the active tab. Enter the domain ID manually or check extension permissions.", "error");
  } finally {
    detectButton.disabled = false;
    updateSubmitState();
  }
}

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const domainId = domainInput.value.trim();
  if (!domainId) {
    updateDomainStatus("Please enter a Noibu domain ID before sending.", "error");
    updateSubmitState();
    return;
  }

  const component = document.getElementById("component").value.trim();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const status = document.getElementById("status").value;
  const version = document.getElementById("version").value.trim();
  const releaseTimeRaw = releaseTimeInput.value;

  let formattedReleaseTime;
  try {
    formattedReleaseTime = formatReleaseTime(releaseTimeRaw);
  } catch (error) {
    showMessage("Please provide a valid release time.", "error");
    return;
  }

  const payload = {
    component,
    title,
    description,
    status,
    version,
    release_time: formattedReleaseTime,
  };

  const confirmationLines = [
    "Send release notification with the following details?",
    `Domain ID: ${domainId}`,
    `Component: ${component}`,
    `Title: ${title}`,
    `Description: ${description}`,
    `Status: ${status}`,
    `Version: ${version}`,
    `Release Time: ${formattedReleaseTime}`,
  ];

  const confirmed = window.confirm(confirmationLines.join("\n"));
  if (!confirmed) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending…";

  try {
    const response = await fetch(`https://webhook.noibu.com/release_webhook/${domainId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(responseText || `Request failed with status ${response.status}`);
    }

    showMessage("Release notification sent successfully!", "success");
  } catch (error) {
    console.error(error);
    showMessage(`Failed to send release notification: ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send Release Notification";
  }
});

detectButton.addEventListener("click", () => {
  detectDomainFromActiveTab();
});

domainInput.addEventListener("input", () => {
  const value = domainInput.value.trim();
  if (value.length === 36) {
    updateDomainStatus(`Domain ready: ${value}`, "success");
  } else if (value.length === 0) {
    updateDomainStatus("Enter the domain ID from your Noibu console URL.");
  } else {
    updateDomainStatus("Domain IDs should be 36 characters.", "error");
  }
  updateSubmitState();
});

document.addEventListener("DOMContentLoaded", () => {
  setReleaseTimeDefault();
  updateSubmitState();
  detectDomainFromActiveTab();
});
