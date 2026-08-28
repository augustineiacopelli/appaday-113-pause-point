# Pause Point

**AppADay 113** &middot; Companion browser extension to [Temptation Ledger (App 112)](https://augustineiacopelli.github.io/appaday-112-temptation-ledger/)

A Manifest V3 Chrome extension that inserts a sixty second pause, with a reason prompt, before you can visit sites you are trying to avoid. Add a domain to the blocklist, and the next time you navigate there you land on a pause screen instead: a question about what is pulling you there, a sixty second countdown with your reason held on screen, and then a choice between closing the tab or continuing anyway. Every outcome is logged and rolled into a running "held" streak shown in the toolbar popup.

Live portfolio: https://augustineiacopelli.github.io/appaday/

## What it does

- Maintains a blocklist of domains, managed from the toolbar popup
- Redirects blocked navigations to a pause screen using declarativeNetRequest, before the page loads
- Captures a short reason for the visit and keeps it visible through the sixty second countdown
- Records every outcome (held or yielded) to a local history log
- Tracks a current and best "held" streak, reset on yield
- Grants a fifteen minute temporary pass on "continue anyway," auto-reverted with a chrome.alarms timer
- Reconciles its dynamic rules from storage on every service worker wake, since Chrome kills the worker after roughly thirty seconds idle

## Install

1. Grab `pause-point-extension.zip` from this repo (also linked as a download button on the landing page) and unzip it locally.
2. Open `chrome://extensions` in Chrome or another Chromium-based browser.
3. Turn on **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the Pause Point icon to the toolbar and add your first domain from the popup.

This is a sideloaded, developer-mode extension rather than a Chrome Web Store listing. All data (blocklist, rule map, streak, history) lives in `chrome.storage.local` on your machine and is never transmitted anywhere.

## File structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3 declaration: permissions, service worker, popup, web-accessible pause page |
| `storage.js` | Shared get/set wrappers around `chrome.storage.local` |
| `background.js` | Service worker: builds and reconciles declarativeNetRequest rules, handles popup and pause-page messages, manages the temporary-allow alarm |
| `redirect.html` / `redirect.js` | The pause screen: reason prompt, sixty second countdown, close-or-continue |
| `popup.html` / `popup.js` | Toolbar popup: add/remove blocklist domains, read-only streak display |
| `icons/` | Extension icons at 16, 48, and 128px |
| `index.html` | This repo's GitHub Pages landing page |

## How the pause works

Blocked domains are enforced with Manifest V3's declarativeNetRequest, so the redirect fires before the page ever loads and no broad browsing-history access is needed. A rule map in storage keeps each domain tied to a stable dynamic rule ID across service worker restarts. Choosing "continue anyway" swaps in a temporary higher-priority allow rule for that domain and sets a fifteen minute `chrome.alarms` timer that reverts it automatically, even if the worker has gone back to sleep in the meantime.

## Standards

Built to AppADay technical standards: no build step, no external dependencies beyond Google Fonts on the landing page, `localStorage`-equivalent (`chrome.storage.local`) calls wrapped in try/catch throughout, 44px minimum tap targets, and the required portfolio backlink on the landing page header and footer.
