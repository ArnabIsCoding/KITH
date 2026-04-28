# Kith — Community Risk Intelligence Platform

Kith helps NGOs and field teams identify and respond to substance abuse and mental health risk in communities. It analyzes survey data, photos, and bulk uploads using Gemini AI to generate risk scores, maps hotspots, and coordinates field deployments.

---

## Architecture

```
D:/VS/KITH/
├── client/                          ← React + TypeScript frontend
│   ├── .env                         ← Environment variables (see Configuration)
│   ├── firebase.json                ← Firebase Hosting config
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── App.tsx
│       ├── firebase.ts
│       ├── theme.ts
│       ├── assets/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Footer.tsx
│       │   ├── ActiveDeploymentsCard.tsx
│       │   ├── InterventionOutcomeModal.tsx
│       │   ├── KithCursor.tsx
│       │   ├── MyNestCard.tsx
│       │   ├── OfflineQueuePanel.tsx
│       │   └── onboarding/
│       │       ├── AnalysisResultUI.tsx
│       │       ├── BulkUpload.tsx
│       │       ├── DirectUpload.tsx
│       │       ├── PhotoUpload.tsx
│       │       ├── CategoriesForm.tsx
│       │       ├── PreferencesForm.tsx
│       │       ├── ProfileForm.tsx
│       │       ├── ReviewForm.tsx
│       │       └── EconomicsHelperForm.tsx
│       ├── context/
│       │   └── AuthContext.tsx      Firebase Auth
│       ├── models/
│       │   ├── OnboardPageProps.ts
│       │   ├── TeamAssignmentModel.ts
│       │   ├── TeamMemberModel.ts
│       │   └── UserModel.ts
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── ExplorePage.tsx      Ops Map heatmap
│       │   ├── ActiveDeployments.tsx
│       │   ├── ImpactPage.tsx
│       │   ├── LandingPage.tsx
│       │   ├── MyNestPage.tsx
│       │   ├── OnboardingPage.tsx
│       │   ├── SignInPage.tsx
│       │   └── TeamManagementPage.tsx
│       └── services/
│           ├── ExploreService.ts
│           ├── OfflineSyncService.ts
│           ├── PrivacyService.ts
│           ├── SurveyService.ts
│           ├── TeamService.ts
│           └── UserProfileServices.ts
│
├── functions/                       Firebase Cloud Functions
│   ├── main.py                      All 9 API endpoints
│   ├── requirements.txt
│   └── .env.local
│
├── server/                         	DEPRECATED replaced by functions/
│   ├── server.py
│   ├── system_instructions.py
│   └── requirements.txt
│
├── firebase.json                    Root Firebase config functions + hosting
├── .firebaserc                      Firebase project alias
└── README.md
```

---

## What Changed from the Original

| Before | After |
|---|---|
| Flask server (`server.py`) running locally on port 5000 | Firebase Cloud Functions (Python 3.12) deployed to GCP |
| `google-generativeai` SDK (deprecated) | `google-genai` SDK (new) |
| Gemini Developer API (`generativelanguage.googleapis.com`) via API key | Vertex AI API (`aiplatform.googleapis.com`) via service account — no API key needed |
| `REACT_APP_geminiAIKey` in client `.env` | Not needed — auth is handled by GCP service account |
| `gcloud run deploy` for backend | `firebase deploy --only functions` |
| Flask kebab-case routes (`/analyze-economy`) | Firebase camelCase function names (`/analyzeEconomy`) |
| No rate limiting | Per-user daily rate limiting via Firestore |
| No auth on API calls | Firebase ID token required on all Gemini endpoints |

---

## Prerequisites

- Node.js 18+ and npm
- Python 3.12
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK (`gcloud`)
- A Firebase project with Firestore, Realtime Database, and Hosting enabled

---

## First-Time Setup

> **Finding your project values:**
> - `your-firebase-project-id` — Firebase Console → Project Settings → General → Project ID (e.g. `my-app-12345`)
> - `<project-number>` — same page, the numeric "Project number" field (e.g. `123456789012`)

### 1. Clone and link Firebase project

```bash
# Login to Firebase
firebase login

# List your projects to find your project ID
firebase projects:list

# From project root, set the active project
firebase use your-firebase-project-id
```

If `firebase use` fails with "not in a Firebase app directory", create `.firebaserc` manually at the project root:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 2. Enable required GCP APIs

```bash
# Enable Vertex AI (used by all Gemini calls)
gcloud services enable aiplatform.googleapis.com --project=your-firebase-project-id

# Grant the Cloud Functions service account permission to call Vertex AI
gcloud projects add-iam-policy-binding your-firebase-project-id \
  --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### 3. Set the Gemini API secret (production)

```bash
firebase functions:secrets:set GEMINI_API_KEY
# Paste your key when prompted
# Note: this key is no longer used by the functions (Vertex AI uses service account auth)
# but kept for potential future use
```

### 4. Install Python dependencies (for local development)

```bash
cd functions
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 5. Install client dependencies

```bash
cd client
npm install
```

---

## Configuration

### `client/.env`

```plaintext
# Firebase SDK
REACT_APP_apiKey=YOUR_FIREBASE_API_KEY
REACT_APP_authDomain=YOUR_AUTH_DOMAIN
REACT_APP_projectId=your-firebase-project-id
REACT_APP_storageBucket=YOUR_STORAGE_BUCKET
REACT_APP_messagingSenderId=YOUR_MESSAGING_SENDER_ID
REACT_APP_appId=YOUR_APP_ID
REACT_APP_databaseURL=YOUR_REALTIME_DB_URL

# Google Maps
REACT_APP_googleMapsAPIKey=YOUR_GOOGLE_MAPS_API_KEY

# Backend — points to Firebase Functions
REACT_APP_BACKEND_URL=https://us-central1-your-firebase-project-id.cloudfunctions.net
```

### `functions/.env.local` (local emulator only — never deployed)

```plaintext
GEMINI_API_KEY=your_key_here
```

---

## Running Locally

```bash
# Terminal 1 — Firebase emulator
firebase emulators:start --only functions,hosting

# Terminal 2 — React dev server
cd client
npm start
```

The React app will be available at `http://localhost:3000`.
Functions will be available at `http://localhost:5001/your-firebase-project-id/us-central1/<functionName>`.

---

## Deploying

### Deploy backend (functions only)

```bash
# From project root D:\VS\KITH
firebase deploy --only functions
```

### Deploy frontend (hosting only)

```bash
# Build first
cd client
npm run build

# Then deploy from client directory (firebase.json is in client/)
firebase deploy --only hosting
```

### Deploy everything

```bash
cd client && npm run build && cd ..
firebase deploy
```

---

## API Endpoints

All endpoints are Firebase Cloud Functions at:
`https://us-central1-your-firebase-project-id.cloudfunctions.net/<functionName>`

| Function | Method | Description | Auth Required |
|---|---|---|---|
| `fetchPeopleInfo` | GET | Health check | No |
| `analyzeSurvey` | POST | Analyze survey text or image with Gemini | Yes |
| `bulkUpload` | POST | Analyze bulk CSV/Excel/JSON file | Yes |
| `analyzeEconomy` | POST | Estimate economic strength of a location | Yes |
| `generateContent` | POST | Generic Gemini content generation | Yes |
| `analyzeMapCrime` | POST | Crime risk scoring for map locations | Yes |
| `getGooglePlaceInfo` | GET | Place info stub | No |
| `bulkUploadTeam` | POST | Extract team members from a file | Yes |
| `root` | GET | API info and endpoint list | No |

"Auth Required" means the request must include `Authorization: Bearer <Firebase ID token>` — enforced by the per-user rate limiter.

### Per-user daily rate limits

| Endpoint | Limit |
|---|---|
| `analyzeSurvey` | 20 / day |
| `bulkUpload` | 10 / day |
| `analyzeEconomy` | 30 / day |
| `generateContent` | 20 / day |
| `analyzeMapCrime` | 15 / day |
| `bulkUploadTeam` | 10 / day |

---

## Cost Controls

Three layers of protection against runaway billing:

1. **Budget alert** — GCP Billing → Budgets & Alerts → set a monthly cap with email alerts
2. **Vertex AI quota** — GCP Console → APIs & Services → Vertex AI API → Quotas & System Limits → set `Generate content requests per minute` and `per day`
3. **Per-user rate limiting** — enforced in `functions/main.py` via Firestore counters, resets daily at midnight UTC

---

## Built With

- **Frontend**: React, TypeScript, Material UI, Framer Motion, Lucide React
- **Backend**: Firebase Cloud Functions (Python 3.12)
- **AI**: Google Gemini 2.5 Flash via Vertex AI
- **APIs**: Google Maps JavaScript API, Places API, Geocoding API, Drawing API, Heatmap (Visualization) API, Vertex AI API
- **Database**: Firebase Realtime Database (survey data, team assignments), Firestore (rate limiting)
- **Auth**: Firebase Authentication (Google Sign-In)
- **Hosting**: Firebase Hosting

---

## License

This project is licensed under the MIT License.
