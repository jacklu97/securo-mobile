# Securo Mobile

Minimal Tauri 2 companion app for a [Securo](../securo) instance. One codebase, every target
Tauri supports — plus an installable PWA for anyone who doesn't want a native app:

| Target | How |
| --- | --- |
| Android (APK/AAB) | Tauri mobile (`gen/android` is initialized) |
| iOS | Tauri mobile (`tauri ios init` — needs full Xcode, see below) |
| macOS / Windows / Linux | Tauri desktop |
| Web / PWA | `npm run build` → deploy `dist/` (service worker + manifest included) |

Stack matches securo's frontend: React 19 + Vite 7 + TypeScript + Tailwind 4.

## What it does (v1 shell)

Pairs with a Securo instance using the device-pairing QR flow that already exists in the fork:

1. On the Securo web app, open **Settings → Devices → Pair new device**. It shows a QR encoding
   `{ v: 1, url, code }`.
2. This app scans it (native scanner plugin on Android/iOS, camera + jsQR on web/desktop, manual
   URL+code entry as fallback) and calls `POST {url}/api/devices/pair`.
3. Tokens are stored locally; requests go through `authedFetch()` which auto-refreshes the rotating
   refresh token via `POST /api/devices/token` on 401 and unpaires if the device was revoked.
4. Home screen heartbeats every 30 s (`POST /api/devices/heartbeat`) so the device shows as
   **Connected** in Securo's device manager, and shows the paired account (`GET /api/users/me`).

Feature screens (dashboard, transactions, …) are intentionally not ported yet — this is the shell.

## Develop

```sh
npm install
npm run dev          # web only, http://localhost:5173
npm run tauri dev    # desktop app
```

## Android

Requires `ANDROID_HOME` + NDK (already set up on this machine) and Rust android targets.

```sh
npm run tauri android dev      # run on emulator/device
npm run tauri android build    # release AAB/APK (needs signing config for release)
```

Camera permission for the QR scanner is declared in
`src-tauri/gen/android/app/src/main/AndroidManifest.xml`.

## iOS

Needs full Xcode (not just CommandLineTools): install Xcode, then

```sh
sudo xcode-select -s /Applications/Xcode.app
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
npm run tauri ios init
```

After init, add the camera usage string to `src-tauri/gen/apple/*_iOS/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Scan the Securo pairing QR code</string>
```

Then `npm run tauri ios dev` / `npm run tauri ios build`.

## PWA

`npm run build` produces `dist/` with `manifest.webmanifest` and a precaching service worker
(vite-plugin-pwa, auto-update). Deploy it on any static host and users can "Add to Home Screen".

**CORS caveat:** the Tauri apps call the instance through `tauri-plugin-http`, which is not subject
to webview CORS. The PWA uses the browser's `fetch`, and securo's backend only allows
`settings.frontend_url` as an origin (`backend/app/main.py`). So either serve this PWA from the
same origin as the instance (e.g. a path/subdomain on it) or add the PWA's origin to the backend's
`allow_origins` list in the fork. The camera scanner on the web also requires a secure context
(https or localhost).

## Where things live

- `src/lib/api.ts` — pairing, token refresh, authed fetch against the paired instance
- `src/lib/storage.ts` — persisted device credentials (localStorage)
- `src/components/PairScreen.tsx` — scan / manual pairing UI
- `src/components/HomeScreen.tsx` — connected state + heartbeat
- `src-tauri/capabilities/` — `default.json` (all platforms) and `mobile.json` (barcode scanner)
- `app-icon.png` — icon source; regenerate all platform icons with `npm run tauri icon app-icon.png`
