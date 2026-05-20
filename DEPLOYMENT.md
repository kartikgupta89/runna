# Deploying Runna to Vercel

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- A free [Vercel account](https://vercel.com/signup)

## First deploy

```bash
# From the project root
npm run build          # verify it compiles locally first
vercel                 # follow the prompts (link to new project)
```

Vercel auto-detects Next.js. Accept all defaults. The app will be deployed to a `.vercel.app` URL.

## Subsequent deploys

```bash
vercel --prod
```

## Environment variables

None required — all data is stored client-side in IndexedDB.

## PWA install instructions (for users)

### iPhone / iPad (Safari)
1. Open the app URL in Safari.
2. Tap the **Share** button (box with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

### Android (Chrome)
1. Open the app URL in Chrome.
2. Tap the browser menu (⋮) → **Add to Home screen** (or **Install app**).
3. Tap **Add** / **Install**.

### Desktop Chrome / Edge
1. Open the app URL.
2. Click the install icon (⊕) in the address bar, or go to browser menu → **Install Runna**.

## Notes

- All training data lives in the browser's IndexedDB — it is private to your device and never sent to a server.
- Clearing browser data / site data will erase your plan. Export or screenshot your plan if needed before clearing.
- The service worker caches the app shell so it loads offline after the first visit.
