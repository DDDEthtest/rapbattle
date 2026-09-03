# RAPBATTLE — deploy & local setup

Firebase project: **`rapbattle-e6ae7`**  
GitHub: https://github.com/DDDEthtest/rapbattle

## Prerequisites

- Node 20+
- Firebase CLI (`npx firebase-tools` is fine)
- `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` in `functions/.env` (never commit)

## Local development

```bash
# terminal 1 — API
cd functions
npm install
npm run serve

# terminal 2 — UI
cd frontend
npm install
npm run beat   # from repo root: npm run beat
npm run dev
```

Open http://localhost:5173  
Vite proxies `/api/*` → Functions emulator.

Generate the beat (once):

```bash
node scripts/generate-beat.mjs
```

## Production environment

`functions/.env` is loaded by the Firebase CLI on deploy (keep it gitignored).
Ensure these keys exist before deploying:

```
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

Optional: migrate to `firebase functions:secrets:set` later for stronger secret management.

## Deploy

```bash
npm run build --prefix functions
npm run build --prefix frontend
firebase deploy --only functions,hosting --project rapbattle-e6ae7
```

## GitHub Actions

Workflow: `.github/workflows/deploy.yml`

- **build** runs on every push to `main` (no secrets required).
- **deploy** runs only when repo variable `ENABLE_FIREBASE_DEPLOY=true`.

### Enable auto-deploy

1. Firebase Console → Project settings → [Service accounts](https://console.firebase.google.com/project/rapbattle-e6ae7/settings/serviceaccounts/adminsdk) → **Generate new private key**
2. Grant that service account roles: Cloud Functions Admin, Firebase Hosting Admin, Service Account User, Artifact Registry Writer (or use Editor for a pilot)
3. GitHub repo → Settings → Secrets and variables → Actions:
   - Secret `FIREBASE_SERVICE_ACCOUNT` = full JSON key contents
   - Variable `ENABLE_FIREBASE_DEPLOY` = `true`
4. Push to `main` (or re-run the workflow)
