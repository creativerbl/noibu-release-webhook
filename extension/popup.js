const domainStatusEl = document.getElementById("domain-status");
const messageEl = document.getElementById("message");
const releaseForm = document.getElementById("release-form");
const submitButton = document.getElementById("submit-button");
const releaseTimeInput = document.getElementById("release-time");
const domainIdInput = document.getElementById("domain-id");

let domainId = "";

function updateSubmitButtonState() {
  submitButton.disabled = domainIdInput.value.trim() === "";
}

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

domainIdInput.addEventListener("input", () => {
  domainId = domainIdInput.value.trim();

  if (domainId) {
    updateDomainStatus(`Using domain ID: ${domainId}`);
  } else {
    updateDomainStatus("Enter a Noibu domain ID or open a Noibu console project.", "error");
  }

  updateSubmitButtonState();
});

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.textContent = "";
  messageEl.className = "message";
}

async function initialize() {
  setReleaseTimeDefault();
  updateDomainStatus("Detecting Noibu project domain…");
  updateSubmitButtonState();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      updateDomainStatus("Unable to detect the current tab URL. Enter a Noibu domain ID.", "error");
      domainId = "";
      updateSubmitButtonState();
      return;
    }

    const detectedDomainId = extractDomainId(tab.url);
    if (!detectedDomainId) {
      updateDomainStatus(
        "Unable to detect domain automatically. Enter a Noibu domain ID.",
        "error",
      );
      domainId = "";
      updateSubmitButtonState();
      return;
    }

    const currentDomainValue = domainIdInput.value.trim();
    domainId = currentDomainValue || detectedDomainId;

    if (!currentDomainValue) {
      domainIdInput.value = detectedDomainId;
    }

    updateDomainStatus(
      `Domain detected automatically: ${detectedDomainId}. You can edit the domain ID if needed.`,
    );
    updateSubmitButtonState();
  } catch (error) {
    console.error(error);
    updateDomainStatus(
      "Unable to access active tab. Enter a Noibu domain ID or grant the required permissions.",
      "error",
    );
    domainId = "";
    updateSubmitButtonState();
  }
}

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const domainIdValue = domainIdInput.value.trim();
  if (!domainIdValue) {
    showMessage("Please provide a Noibu domain ID.", "error");
    return;
  }

  domainId = domainIdValue;

  const component = document.getElementById("component").value.trim();
  const title = document.getElementById("title").value.trim();
  const descriptionInput = document.getElementById("description").value;
  const status = document.getElementById("status").value;
  const versionInput = document.getElementById("version").value;
  const releaseTimeRaw = releaseTimeInput.value;

  const description = descriptionInput.trim();
  const version = versionInput.trim() === "" ? " " : versionInput.trim();
  const versionConfirmationText =
    version === " " ? "(blank — sending single space)" : version;

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
    `Domain ID: ${domainIdValue}`,
    `Component: ${component}`,
    `Title: ${title}`,
    `Description: ${description || "Not provided"}`,
    `Status: ${status}`,
    `Version: ${versionConfirmationText}`,
    `Release Time: ${formattedReleaseTime}`,
  ];

  const confirmed = window.confirm(confirmationLines.join("\n"));
  if (!confirmed) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Sending…";

  try {
    const response = await fetch(`https://webhook.noibu.com/release_webhook/${domainIdValue}`, {
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

document.addEventListener("DOMContentLoaded", initialize);
