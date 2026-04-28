# Kith Backend — Firebase Functions (Python)

This replaces the old Flask `server.py` + `system_instructions.py` with
Firebase Cloud Functions using the Python 3.12 runtime.

---

## Project layout after migration

```
D:/
├── client/
├── functions/               replaces /server
│   ├── main.py              All 9 routes as Firebase Functions
│   ├── requirements.txt     Python deps
│   └── .env.local
├── firebase.json            Hosting + Functions config
└── .firebaserc              project ID
```

---

## One-time setup

### 1  Install Firebase CLI (if not already)
```bash
npm install -g firebase-tools
firebase login
```

### 2  Link your Firebase project
```bash
firebase use --add
# choose your project: example sahayak-risk-dashboard
```

### 3  Create a Python virtual env for local dev (optional but recommended)
```bash
cd functions
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## Secrets / environment variables

### Local emulation
Edit `functions/.env.local`:
```
GEMINI_API_KEY=AIza...your_key_here
```
This file is picked up automatically by the Firebase emulator and is **not deployed**.

### Production (Secret Manager — recommended)
```bash
firebase functions:secrets:set GEMINI_API_KEY
# paste your key when prompted
```
Then grant the Functions service account access:
```
Firebase Console → Project settings → Service accounts → copy email
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:<SA_EMAIL>" \
  --role="roles/secretmanager.secretAccessor"
```

Alternatively use `firebase functions:config:set` (older method):
```bash
firebase functions:config:set gemini.key="AIza..."
```
And read it in `main.py` via `os.environ.get("GEMINI_KEY")`.

---

## Running locally

```bash
firebase emulators:start --only functions,hosting
```

Your functions will be available at:
```
http://localhost:5001/<project-id>/us-central1/<functionName>
```

The hosting rewrite maps `/api/<name>` → the matching function, so your
React app can call `http://localhost:5000/api/analyzeSurvey` just like before.

---

## Deploying to production

```bash
firebase deploy --only functions
# or deploy everything at once:
firebase deploy
```

After deploy, your URLs will be:
```
https://us-central1-<project-id>.cloudfunctions.net/analyzeSurvey
```

Or via hosting rewrites:
```
https://kith.arnabiscoding.com/api/analyzeSurvey
```

---

## Updating your React frontend

In your client service files, replace the old Flask base URL:

```ts
// Before (pointing at local Flask server)
const BASE_URL = "http://localhost:5000";

// After (use relative paths via hosting rewrites, or the Functions URL)
const BASE_URL = process.env.NODE_ENV === "production"
  ? ""                          // relative — hits hosting rewrites
  : "http://localhost:5000";    // local emulator hosting port
```

|			kebab-Case 					 | 					CamelCase 				 |
| Old Flask route          | New Firebase route          |
|--------------------------|-----------------------------|
| `/fetch-people-info`     | `/fetchPeopleInfo`      |
| `/bulk-upload`           | `/bulkUpload`           |
| `/analyze-survey`        | `/analyzeSurvey`        |
| `/analyze-economy`       | `/analyzeEconomy`       |
| `/generate-content`      | `/generateContent`      |
| `/analyze-map-crime`     | `/analyzeMapCrime`      |
| `/get-google-place-info` | `/getGooglePlaceInfo`   |
| `/bulk-upload-team`      | `/bulkUploadTeam`       |

# For direct Cloud Functions (no /api/ needed)
REACT_APP_BACKEND_URL=https://us-central1-your-firebase-project-id.cloudfunctions.net

# Change to — hosting domain (needs /api/)
REACT_APP_BACKEND_URL=https://custom.domain.com

All endpoint paths stay the same **except** they now live under `/api/`:

| Old route          				| New route          |
|--------------------------|-----------------------------|
| `/fetchPeopleInfo`     	| `/api/fetchPeopleInfo`      |
| `/bulkUpload`           | `/api/bulkUpload`           |
| `/analyzeSurvey`        | `/api/analyzeSurvey`        |
| `/analyzeEconomy`       | `/api/analyzeEconomy`       |
| `/generateContent`      | `/api/generateContent`      |
| `/analyzeMapCrime`     	| `/api/analyzeMapCrime`      |
| `/getGooglePlaceInfo` 	| `/api/getGooglePlaceInfo`   |
| `/bulkUploadTeam`      	| `/api/bulkUploadTeam`       |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: google.genai` | Run `pip install -r requirements.txt` inside `functions/` |
| `GEMINI_API_KEY not found` | Add key to `functions/.env.local` for local, Secret Manager for prod |
| CORS errors in browser | Check `ALLOWED_ORIGINS` list in `main.py` includes your domain |
| Function timeout | Increase `timeout_sec` in `options.set_global_options()` (max 540s) |
| Memory errors on large Excel files | Increase `memory` in `options.set_global_options()` to `MB_1024` |
