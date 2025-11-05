# Noibu Release Webhook Chrome Extension

This repository contains a Chrome extension that sends release notifications to the Noibu Release Monitoring webhook without manually crafting `curl` commands. The extension can auto-detect the domain ID from the active Noibu console tab, collect release metadata, confirm the details with the user, and send the webhook request in one click.

## Features

- **Domain auto-detection** – extracts the 36-character project ID from the active `console.noibu.com` tab and pre-fills the form. Manual entry is also supported.
- **Guided payload form** – captures component, title, description, status, version, and release time with validation and helpful defaults.
- **Confirmation & feedback** – prompts the user to confirm the payload prior to sending, then displays success or error feedback once the webhook responds.

## Getting Started

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the `extension/` directory from this project.
5. Pin the extension if desired for quick access.

## Usage

1. Navigate to your project within the Noibu console (`https://console.noibu.com/<domain-id>/…`).
2. Open the extension popup. It attempts to detect the domain ID automatically; you can also paste it manually.
3. Complete the release details in the form. The release time defaults to the current time in your local timezone, but you can adjust it.
4. Click **Send Release Notification**. Review the confirmation dialog to verify the payload, then confirm to dispatch the webhook call.
5. A success or error message will appear in the popup once the request completes.

## Development Notes

- The extension relies on the [`chrome.tabs`](https://developer.chrome.com/docs/extensions/reference/tabs/) API to read the active tab URL for domain detection. Chrome will prompt for permission the first time the extension needs access.
- Release times entered through the `datetime-local` field are converted into an ISO 8601 timestamp with your local timezone offset before they are sent to the webhook endpoint.
- Network responses are displayed as readable errors when possible to ease troubleshooting.

Feel free to adapt the UI or add new fields to match your release workflow.
