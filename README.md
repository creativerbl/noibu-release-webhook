# Noibu Release Webhook Chrome Extension

This repository contains a Chrome extension that sends release notifications to the [Noibu Release Monitoring webhook](https://help.noibu.com/hc/en-us/articles/20651167899149-Release-Monitoring-Configuring-a-Generic-Webhook) without manually writing `curl` commands. The popup detects your domain ID from the active Noibu console tab, gathers release metadata, confirms it, and dispatches the webhook request for you.

## Features

- **Automatic domain detection** – reads the project ID from the active `console.noibu.com/<domain-id>/…` tab and displays it in the popup.
- **Release payload form** – captures component, title, description, status, version, and release time with sensible defaults.
- **Confirmation & feedback** – asks you to confirm the payload before sending and surfaces success or error states in the popup.

## Getting Started

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the `extension/` directory from this project.
5. Pin the extension if desired for quick access.

## Usage

1. Open the Noibu console to the project whose releases you want to log (e.g. `https://console.noibu.com/<domain-id>/…`).
2. Launch the extension from the toolbar. The domain ID banner should display the detected 36-character ID.
3. Fill out the release details in the form. The release time defaults to the current time in your local timezone, but you can adjust it before sending.
4. Press **Send Release Notification**. Review the confirmation dialog to verify the payload, then approve it to trigger the webhook.
5. The popup will report whether the webhook succeeded or failed.

## Development Notes

- The extension uses the [`chrome.tabs`](https://developer.chrome.com/docs/extensions/reference/tabs/) API to inspect the active tab URL. Chrome may prompt for permission the first time it runs.
- Release times from the `datetime-local` field are converted to ISO 8601 strings including your local timezone offset so they match the webhook's expectations.
- Any non-OK HTTP response is surfaced with the server's text response (when available) to simplify troubleshooting.
