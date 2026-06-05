# KITH — Post-Mortem Interview

> **Format:** A senior engineer (SE) interviews the developer (Dev) about every major decision made on KITH for the Google Solution Challenge 2026. The goal is to find the root causes of the loss, not to be kind about it.

---

## Part 1: The Pitch vs. The Reality

**SE:** Read me your own repository description back to me.

**Dev:** "An AI-powered geospatial intelligence platform that detects early warning signs of substance abuse and mental health crises — giving NGOs and field teams actionable, map-based intelligence in real time."

**SE:** Now tell me what the system actually does, technically, from input to output.

**Dev:** A field worker logs in, fills out a survey form, optionally uploads a photo or a CSV file. That data gets sent to a Firebase Cloud Function. The function calls Gemini 2.5 Flash with the data. Gemini returns a structured risk assessment. The score gets saved to Firebase Realtime Database and plotted as a heatmap on Google Maps.

**SE:** So it's a form, a Gemini API call, and a Maps heatmap.

**Dev:** ...yes, at the core.

**SE:** Then why is the description using the words "geospatial intelligence"? What is geospatial about it beyond putting a dot on a map?

**Dev:** The heatmap clusters risk scores by location. You can see hotspots.

**SE:** A heatmap of numbers you made up by prompting an LLM is not geospatial intelligence. Geospatial intelligence means spatial autocorrelation, kernel density estimation, proximity analysis, demographic overlay, statistical significance testing. You have none of that. You have Google Maps Visualization API. That gap — between what you claimed and what you built — is the first place you lost points.

---

## Part 2: The Architecture Pivot

**SE:** Your README has a section called "What Changed from the Original." Walk me through what that means.

**Dev:** Originally the backend was a Flask server running locally on port 5000. It used the deprecated `google-generativeai` SDK and a raw Gemini Developer API key. During the competition I migrated everything to Firebase Cloud Functions in Python 3.12, switched to the `google-genai` SDK, and moved to Vertex AI using a service account for auth.

**SE:** When did you do this migration?

**Dev:** Toward the later phase of the competition.

**SE:** And your `server/` directory is still in the repository, explicitly marked DEPRECATED.

**Dev:** Yes.

**SE:** So judges looking at your GitHub see: a deprecated backend folder, a README explaining you changed your entire architecture mid-competition, and 9 total commits. What story does that tell them?

**Dev:** That the project was still figuring itself out at submission time.

**SE:** Correct. It tells them the project was not production-ready. It tells them the architecture was reactive, not planned. The "What Changed" section that you probably wrote to show progress reads exactly the opposite — it reads as a confession that the initial build was wrong. A mature project doesn't need to explain what it replaced; it just has a clean architecture. You documented your own technical debt in the main README.

**SE:** How many commits does the repository have total?

**Dev:** Nine.

**SE:** Nine commits across what, multiple months of competition time?

**Dev:** The competition ran from March to June.

**SE:** So either you developed most of this in a very short burst at the end, or you did a lot of work locally and pushed in bulk. Either way, what a judge sees on GitHub is a project that looks like it was built in a weekend. Shallow git history is not just optics — it signals no iteration, no testing cycles, no refactoring. A real product grows incrementally. Nine commits says you pushed drafts, not a developed product.

---

## Part 3: The AI Integration

**SE:** List every Firebase Cloud Function you defined and what each one does.

**Dev:** `fetchPeopleInfo` — health check. `analyzeSurvey` — takes survey text or an image, sends it to Gemini, returns a risk assessment. `bulkUpload` — takes a CSV/Excel/JSON file, sends it to Gemini, returns analysis. `analyzeEconomy` — estimates economic strength of a location via Gemini. `generateContent` — generic Gemini content generation. `analyzeMapCrime` — crime risk scoring via Gemini. `getGooglePlaceInfo` — place info stub. `bulkUploadTeam` — extracts team members from a file via Gemini. `root` — API info.

**SE:** What does `generateContent` do exactly?

**Dev:** It's a generic endpoint for Gemini content generation. The caller can pass in a prompt and get back a response.

**SE:** You built a pass-through wrapper around the Gemini API and called it a feature.

**Dev:** It was there for flexibility.

**SE:** It's not a feature. It's an uncommitted abstraction. You weren't sure what you needed it for so you left a hole in the API. Judges evaluating your codebase would look at that endpoint and see a project that didn't fully know what it was doing.

**SE:** Now look at your other endpoints. `analyzeSurvey`, `bulkUpload`, `analyzeEconomy`, `analyzeMapCrime`. What is architecturally different between them?

**Dev:** The input format is different. The system prompt given to Gemini is different.

**SE:** So all of them are: take some input, format a prompt, call Gemini, return the response?

**Dev:** Yes.

**SE:** The judging rubric has a specific question for this: *"Is AI used where it truly adds value? Is the model choice justified, or would a simpler approach deliver comparable outcomes?"* If your entire AI layer is prompt engineering over a general-purpose LLM with no validation, no ground truth, no accuracy measurement — can you argue that a simpler approach wouldn't work?

**Dev:** A rule-based scoring system would be less flexible.

**SE:** Would it? For substance abuse risk scoring at a specific location, domain experts have already built validated rubrics — things like DAST-10, AUDIT, or the DSM-5 screening criteria. A scoring system based on those standards with defined weights per question would be transparent, explainable, and reproducible. Your Gemini approach produces different answers for the same input on different runs. It can't be audited. It can't be explained to a field worker. You traded reliability and explainability for flexibility you never actually demonstrated. That's not a justified use of AI — that's AI for the sake of calling it AI.

**SE:** What's your false positive rate on the risk scoring?

**Dev:** I don't have a measurement for that.

**SE:** What's the accuracy of `analyzeMapCrime` compared to ground truth crime data from any civic dataset?

**Dev:** It's not validated against external data.

**SE:** So you have no idea if your risk scores are right?

**Dev:** The model is reasoning from the survey inputs.

**SE:** You trust Gemini's reasoning on mental health and substance abuse data without any validation against real-world outcomes. For a healthcare-adjacent application targeting NGOs who make resource deployment decisions based on your scores — this is not just a technical gap. It's an ethics problem. The judging criteria asks: *"Are secure development practices followed end-to-end? Is user data protected with clear privacy and ethical safeguards?"* Sending sensitive community mental health data to an external LLM API with no privacy framework, no consent mechanism, no discussion of data residency — that is a failure on the privacy and ethics dimension.

---

## Part 4: The Problem Framing

**SE:** Which problem track did you submit under?

**Dev:** Most likely Problem 5 — Smart Resource Allocation / Data-Driven Volunteer Coordination for Social Impact.

**SE:** The objective of that track is: *"Create a data-driven coordination platform that consolidates local need signals and intelligently maps volunteers to the highest-priority tasks and regions."* What does KITH do to coordinate volunteers or map them to tasks?

**Dev:** There's a Team Management page. You can assign team members to deployments.

**SE:** Manual assignment. Not intelligent mapping. The track's objective specifically says "intelligently maps volunteers to the highest-priority tasks." You built a manual team roster with no routing logic, no priority optimization, no volunteer skill matching. The core differentiator of the problem statement — the thing that would make a solution stand out — you didn't build.

**SE:** Have you spoken to any actual NGO worker about whether this tool solves their problem?

**Dev:** No.

**SE:** Field teams working in substance abuse and mental health contexts in India are operating in environments with low bandwidth, often no connectivity, linguistic diversity, and time pressure. They're not filling out multi-step web forms on a laptop. What was your onboarding flow?

**Dev:** CategoriesForm, PreferencesForm, ProfileForm, ReviewForm, EconomicsHelperForm — five steps.

**SE:** Five forms before a field worker can start collecting data. On a web app. With no mobile interface. The target user is someone in the field. The product requires a laptop and a stable internet connection. That is a fundamental user-context mismatch that no amount of technical polish fixes.

**SE:** Is there any multilingual support?

**Dev:** No.

**SE:** India has 22 scheduled languages and hundreds of dialects. A platform for NGO field teams in India that is English-only is not deployable in its target environment.

---

## Part 5: The Technical Stack vs. The Problem

**SE:** You're claiming real-time geospatial intelligence. What does "real-time" mean in your implementation?

**Dev:** Survey data is written to Firebase Realtime Database, so the dashboard updates as new submissions come in.

**SE:** So the real-time component is Firebase Realtime Database push events on the frontend. That is not platform-differentiating. Every Firebase project gets that. You called it "real-time intelligence" in your pitch for what is essentially a live form-submission feed.

**SE:** Your data architecture is Firebase Realtime Database plus Firestore. What is in Realtime DB versus what is in Firestore?

**Dev:** Survey data and team assignments are in Realtime DB. Rate limiting counters are in Firestore.

**SE:** Rate limiting is in Firestore. This is in the "What Changed" table — you added rate limiting after the fact. So the production deployment initially had no rate limiting on AI-calling endpoints. Anyone with a valid Firebase token could have called `analyzeSurvey` twenty times a second and run up an unbounded Vertex AI bill. That is not a production-ready system. That is a prototype that has not been hardened.

**SE:** What happens to your heatmap data model when you have, say, 100,000 survey submissions?

**Dev:** The ExploreService would query Firebase and render the heatmap.

**SE:** Firebase Realtime Database is a JSON tree. It has no native geospatial indexing, no bounding-box query, no spatial aggregation. At scale, you would be pulling all records client-side and filtering in JavaScript. That does not scale. A real geospatial platform uses PostGIS, BigQuery with GIS functions, or at minimum Firestore with geohash-based queries using GeoFlutterFire-style indexing. You used the wrong database for your core use case. That's not a minor implementation detail — it means the entire platform would need to be re-architected before it could handle real NGO-scale data.

---

## Part 6: The Competing Projects

**SE:** The other problem tracks were: Digital Asset Protection, Rapid Crisis Response, Smart Supply Chains, Unbiased AI Decisions. Imagine you're a judge. You've seen a project that detects bias in ML pipelines — with a validation framework, bias metrics, and an explainability dashboard. Then you see KITH. Which has more technical depth?

**Dev:** The bias detection project.

**SE:** Why?

**Dev:** Because it has measurable outputs. You can actually quantify whether the bias detection is working.

**SE:** Exactly. And what would you have needed to add to KITH to have measurable outputs?

**Dev:** Ground truth labels for risk scores. Historical outcome data. Validation against known cases. A confusion matrix. Some kind of agreement with domain experts on what "high risk" means.

**SE:** None of which you have. Your platform produces risk scores that cannot be evaluated for correctness. That's the core technical problem. You built a system that outputs numbers you cannot verify.

---

## Part 7: What Should Have Been Built

**SE:** If you were restarting this project with what you know now, what is the single most important architectural change you would make?

**Dev:** Define what "risk score" means before writing a single line of code. Partner with one actual NGO. Get them to show me their existing workflow — probably WhatsApp messages, paper forms, Excel sheets. Build the minimum digital version of exactly that workflow. Validate scores against their historical field experience.

**SE:** Good. What's the second change?

**Dev:** Build mobile-first. Flutter, offline-first, sync when connected. The target user is in the field with a phone, not at a desk with a laptop.

**SE:** Third?

**Dev:** If I'm using AI, use it for something rule-based approaches genuinely can't do — like analyzing open-ended text from case notes, or cross-referencing unstructured field reports. Not for structured survey data where a weighted scoring formula is more appropriate and more defensible.

**SE:** Fourth?

**Dev:** Keep the architecture clean from day one. Decide between Flask and Firebase Cloud Functions before writing business logic, not after. Don't let a deprecated server directory sit in the repo at submission time.

**SE:** Fifth?

**Dev:** Don't claim geospatial intelligence if the system doesn't have geospatial computation. Name the actual capability honestly. "Survey-based risk mapping" is what it is. That's still a useful thing. The overclaim made the gap between promise and delivery visible in every interaction with the project.

---

## Summary: The Five Root Causes

### 1. Architecture decided under pressure, not up front
The Flask → Firebase migration happened during the competition. The evidence is in the repo. Nine commits, a deprecated folder, and a "What Changed" table in the README are not signs of confident technical execution. The migration was the right call technically, but it consumed time that should have gone to depth and validation.

### 2. AI integration is decorative, not functional
Every endpoint is a Gemini call. There is no custom model, no validation framework, no accuracy measurement, no explainability layer. The judging criteria explicitly asks whether a simpler approach would have worked equally well. For structured survey scoring, the answer is yes. AI was added because it's an AI hackathon, not because it was the right tool for every sub-problem.

### 3. The risk scores are unvalidated numbers
This is both a technical failure and an ethics failure. A healthcare-adjacent system that produces risk scores with no ground truth, no domain expert review, no false positive analysis, and no explanation mechanism should not be submitted for a competition judging responsible AI use. The system could produce harmful outputs and there is no mechanism to catch that.

### 4. The platform doesn't match its stated user context
Web-only, English-only, five-step onboarding, requires internet connectivity, no mobile app. The stated users are NGO field teams in India. These two things are incompatible. No amount of AI sophistication covers for a product that cannot be used in its deployment environment.

### 5. The claim exceeded the implementation by too large a margin
"Geospatial Intelligence Platform" is a very large claim. "Survey form + Gemini + Google Maps heatmap" is what was built. The gap between claim and implementation is something every judge reads in the first five minutes of evaluating the project. It shifts the lens from "what did they build?" to "why are they overclaiming?" and that is a lens you cannot recover from during judging.

---

## What to Keep

The problem space is real and under-served. NGOs doing community mental health and substance abuse work in India genuinely lack good tooling. The Firebase + Vertex AI technical stack is correct for the deployment model. The team management and deployment tracking features are a valid workflow axis that most competitors wouldn't have thought to include. The domain intuition was good even if the execution had gaps.

The project has bones. It needs a ground-truth validation layer, a mobile interface, one real NGO pilot partner, and an honest renaming of its capabilities. That's a second attempt worth making.

---

*Post-mortem written June 2026.*
