"""
main.py — Firebase Cloud Functions (Python)
Migrated from Flask server.py + system_instructions.py

All routes are now Firebase HTTPS callable / request functions.
Deploy with: firebase deploy --only functions
"""

import os
import json
import time
import base64

import firebase_functions.options as options
from firebase_functions import https_fn
from firebase_admin import initialize_app, auth, firestore
from datetime import datetime, timezone

import pandas as pd
from google import genai
from google.genai import types
from google.api_core.exceptions import DeadlineExceeded, ResourceExhausted
initialize_app()

options.set_global_options(
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=300,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://sahayak-risk-dashboard.web.app",
    "https://sahayak-risk-dashboard.firebaseapp.com",
    "https://kith.arnabiscoding.com",
]


def _cors_headers(req: https_fn.Request) -> dict:
    origin = req.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


def _handle_cors_preflight(req: https_fn.Request):
    """Return a 204 preflight response if this is an OPTIONS request."""
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=_cors_headers(req))
    return None


def _json_response(data, status: int, req: https_fn.Request):
    return https_fn.Response(
        json.dumps(data),
        status=status,
        headers={"Content-Type": "application/json", **_cors_headers(req)},
    )


DAILY_LIMITS = {
    "analyzeSurvey":   20,
    "bulkUpload":      10,
    "analyzeEconomy":  30,
    "generateContent": 20,
    "analyzeMapCrime": 15,
    "bulkUploadTeam":  10,
}


def _get_uid(req: https_fn.Request):
    """
    Verifies Firebase Auth ID token from Authorization header.
    Returns uid string on success, or None if missing/invalid.
    """
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split("Bearer ")[1]
    try:
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        print(f"[Auth] Token verification failed: {e}")
        return None


def _check_rate_limit(uid: str, endpoint: str) -> tuple[bool, int, int]:
    """
    Checks and increments the user's daily call count for an endpoint.
    Returns (allowed, current_count, daily_limit).
    """
    db = firestore.client()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    limit = DAILY_LIMITS.get(endpoint, 20)
    ref = db.collection("rate_limits").document(f"{uid}_{endpoint}_{today}")

    try:
        doc = ref.get()
        if doc.exists:
            count = doc.to_dict().get("count", 0)
            if count >= limit:
                return False, count, limit
            ref.update({"count": firestore.Increment(1)})
            return True, count + 1, limit
        else:
            ref.set({"count": 1, "date": today, "uid": uid, "endpoint": endpoint})
            return True, 1, limit
    except Exception as e:
        print(f"[RateLimit] Firestore error: {e}")
        return True, 0, limit


def _enforce_rate_limit(req: https_fn.Request, endpoint: str):
    """
    Full auth + rate limit check. Returns an error Response or None if allowed.
    """
    uid = _get_uid(req)
    if not uid:
        return _json_response(
            {"success": False, "error": "Unauthorized. Please sign in."},
            401, req
        )

    allowed, count, limit = _check_rate_limit(uid, endpoint)
    if not allowed:
        return _json_response(
            {
                "success": False,
                "error": f"Daily limit of {limit} reached for this feature. Try again tomorrow.",
                "limit": limit,
                "used": count,
            },
            429, req
        )

    return None


def _get_client() -> genai.Client:
    return genai.Client(
        vertexai=True,
        project="sahayak-risk-dashboard",
        location="us-central1",
    )


def _extract_json(text: str):
    cleaned = text.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


def _generate_content(system_instruction: str, search_prompt: str):
    """
    Mirrors the original generate_content() from system_instructions.py.
    Returns a parsed dict/list or None on failure.
    """
    client = genai.Client(
        vertexai=True,
        project="sahayak-risk-dashboard",
        location="us-central1",
    )
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=1,
        top_p=0.95,
        safety_settings=[
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold="BLOCK_NONE",
            )
        ],
    )

    response = None
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=["Follow the system instructions and", search_prompt],
                config=config,
            )
            print("[Gemini] Raw:", response.text)
            return _extract_json(response.text)

        except DeadlineExceeded:
            print(f"[Gemini] Deadline exceeded (attempt {attempt + 1}). Retrying…")
            time.sleep(5)
        except json.JSONDecodeError:
            print(f"[Gemini] JSON decode error (attempt {attempt + 1}). Retrying…")
            time.sleep(1)
        except ResourceExhausted:
            print(f"[Gemini] Resource exhausted (attempt {attempt + 1}). Retrying…")
            time.sleep(10)
        except ValueError as e:
            print(f"[Gemini] ValueError (attempt {attempt + 1}): {e}")
            if response is not None:
                try:
                    print("Prompt feedback:", response.prompt_feedback)
                    print("Finish reason:", response.candidates[0].finish_reason)
                    print("Safety ratings:", response.candidates[0].safety_ratings)
                except Exception:
                    pass
            time.sleep(1)
        except Exception as e:
            print(f"[Gemini] Unexpected error (attempt {attempt + 1}): {e}")
            time.sleep(1)

    print("[Gemini] ❌  Failed after all attempts.")
    return None

GEMINI_PROMPT = """
You are an ethical, privacy-first expert NGO Data Analyst evaluating community vulnerability for early substance abuse and mental health crises in India.
Input will be anonymized survey text, bulk data, photo OCR output, or manual form profiles.

STEP 1: INTERNAL DATA PROCESSING
Extract and evaluate the following metrics internally (use realistic defaults if missing and fix anomalies, e.g., sleep=25 -> 7):
- Sleep hours, Screen time hours, Stress level (1-10), Happiness score (1-10), Social interaction (1-10 or low/medium/high), Mental condition, Age group, Economic strength, and Estimated salary.
- Economic Context: You MUST weigh economic factors (e.g., financial stress from extreme poverty, or conversely, high disposable income enabling access to illicit substances).

STEP 2: RISK SCORING CALCULATION
You MUST strictly follow this weighting rubric to calculate the 'risk_score' (1-10):

CRITICAL RULES (OVERRIDES):
1. Mental Health Overrides: Happiness and Stress levels are the primary indicators.
   - If Happiness is High (7-10) and Stress is Low (1-4), the max risk score CANNOT exceed 4, regardless of other habits.
2. Screen Time is Secondary: High screen time (e.g., 10+ hours) is common in modern tech/remote jobs. Do NOT assign high risk for screen time unless accompanied by High Stress or Low Happiness.
3. Social Connection: High social interaction (7-10 or High) acts as a protective buffer, lowering the overall risk.

SCORING TIERS:
- 1 to 3 (Low Risk): High happiness, low stress, stable employment/work hours, good social interaction.
- 4 to 6 (Moderate Risk): Mixed indicators. Moderate stress (5-7), average happiness, isolated poor habits (poor diet, extreme work hours).
- 7 to 10 (High Risk): High stress (8-10), low happiness (1-4), high negative peer influence, severe sleep deprivation.

STEP 3: OUTPUT FORMAT
Return ONLY a clean JSON object without any markdown fences (```json) or conversational text. Exactly like this:
{
  "risk_score": 2,
  "explanation": "A short 1-2 sentence professional explanation of why this score was given, referencing the data points and economic context.",
  "community_hotspot_level": "Low",
  "key_factors": ["High Happiness", "Low Stress", "Moderate Economic Strength"],
  "location": "When extracting the location, you MUST format it as a standard street address (City, District, State, Country). You are STRICTLY FORBIDDEN from including Google Plus Codes. If a Plus Code is present, remove it. Strip row labels like 'location -'. If no location found, return null."
}
Never include any names, IDs, or personal data.
"""

def _parse_uploaded_file(file_storage) -> str:
    filename = file_storage.filename or ""
    if filename.endswith(".json"):
        data = json.load(file_storage)
        return json.dumps(data)
    elif filename.endswith(".csv"):
        df = pd.read_csv(file_storage)
        return df.to_string()
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file_storage)
        return df.to_string()
    else:
        return file_storage.read().decode("utf-8", errors="ignore")


@https_fn.on_request()
def fetchPeopleInfo(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    return _json_response(
        {"success": True, "message": "Kith Backend Linked", "system_status": "Active"},
        200, req,
    )


@https_fn.on_request()
def bulkUpload(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "bulkUpload")
    if rate_limit_err:
        return rate_limit_err

    try:
        if "file" not in req.files:
            return _json_response({"success": False, "error": "No file uploaded"}, 400, req)

        file = req.files["file"]
        filename = file.filename or ""
        if not filename:
            return _json_response({"success": False, "error": "No selected file"}, 400, req)

        print(f"[bulkUpload] ✅ Received: {filename}")
        processed_text = _parse_uploaded_file(file)
        search_prompt = f"Please analyze the following bulk survey data:\n\n{processed_text}"
        result = _generate_content(GEMINI_PROMPT, search_prompt)

        if result:
            return _json_response({"success": True, "filename": filename, "analysis": result}, 200, req)
        else:
            return _json_response({"success": False, "error": "AI failed to generate a valid response."}, 500, req)

    except Exception as e:
        print(f"[bulkUpload] 🔥 Error: {e}")
        return _json_response({"success": False, "error": str(e)}, 500, req)

@https_fn.on_request()
def analyzeSurvey(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "analyzeSurvey")
    if rate_limit_err:
        return rate_limit_err

    try:
        survey_text = req.form.get("survey_text", "")
        image_file = req.files.get("image")

        if image_file:
            client = _get_client()
            image_bytes = image_file.read()
            filename = image_file.filename or ""
            ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
            mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                        "webp": "image/webp", "gif": "image/gif", "heic": "image/heic"}
            mime_type = image_file.mimetype or mime_map.get(ext, "image/jpeg")

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    GEMINI_PROMPT,
                    f"Additional User Text: {survey_text}",
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                ],
            )
            raw_text = response.text.strip()
            if "```" in raw_text:
                raw_text = raw_text.split("```")[1].replace("json", "").strip()
            result = json.loads(raw_text)

        else:
            search_prompt = f"Input Data: {survey_text}"
            result = _generate_content(GEMINI_PROMPT, search_prompt)
            if not result:
                raise Exception("AI failed to generate a valid response.")

        return _json_response({"success": True, "analysis": result}, 200, req)

    except Exception as e:
        print(f"[analyzeSurvey] 🔥 Error: {e}")
        return _json_response({"success": False, "error": str(e)}, 500, req)

@https_fn.on_request()
def analyzeEconomy(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "analyzeEconomy")
    if rate_limit_err:
        return rate_limit_err

    try:
        data = req.get_json(silent=True) or {}
        location = data.get("location", "")

        if not location:
            return _json_response({"success": False, "error": "Location string is missing"}, 400, req)

        economic_prompt = """
        You are an economic analyst API for NGOs in India.
        Given the following location, estimate the average monthly salary (in INR) for a typical resident and categorize the general economic strength of the area.
        Return ONLY a clean JSON object with no markdown fences, no formatting, and exactly these keys:
        {
          "estimated_salary": "A string range, e.g., '₹15,000 - ₹25,000'",
          "economic_strength": "Low", "Medium", or "High",
          "explanation": "One brief sentence explaining the reasoning based on the area's geography/industry."
        }
        """
        result = _generate_content(economic_prompt, f"Location to Analyze: {location}")

        if result:
            return _json_response({"success": True, "data": result}, 200, req)
        else:
            return _json_response({"success": False, "error": "AI failed to generate a valid economic response."}, 500, req)

    except Exception as e:
        print(f"[analyzeEconomy] 🔥 Error: {e}")
        return _json_response({"success": False, "error": str(e)}, 500, req)

@https_fn.on_request()
def generateContent(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "generateContent")
    if rate_limit_err:
        return rate_limit_err

    try:
        data = req.get_json(silent=True) or {}
        system_instruction = data.get("system_instruction", "")
        search_prompt = data.get("search_prompt", "")

        result = _generate_content(system_instruction, search_prompt)
        if result:
            return _json_response(result, 200, req)
        else:
            return _json_response([], 500, req)

    except Exception as e:
        print(f"[generateContent] 🔥 Error: {e}")
        return _json_response([], 500, req)

@https_fn.on_request()
def analyzeMapCrime(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "analyzeMapCrime")
    if rate_limit_err:
        return rate_limit_err

    try:
        data = req.get_json(silent=True) or {}
        locations = data.get("locations", [])

        if not locations:
            return _json_response({"success": False, "error": "No locations provided"}, 400, req)

        print(f"[analyzeMapCrime] 📍 {len(locations)} location(s) received")

        heatmap_prompt = """
        You are a location risk assessor.
        I will provide a list of locations (latitude, longitude, and address/name).
        Analyze the general crime risk and database presence for each location.
        Assign a "weight" from 0.1 to 10.
        - Weight 0.1 - 2.0: Safe, or no noticeable crime database records (will render as blue).
        - Weight 5.0 - 10.0: Noticeable crime reports or high risk (will render as red).

        Return ONLY a clean JSON array of objects with 'id', 'weight', and 'reasoning'. No markdown fences, no conversational text.
        [
          {"id": "location_1", "weight": 8.5, "reasoning": "High reports of petty theft."}
        ]
        """

        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[heatmap_prompt, f"Locations to analyze:\n{json.dumps(locations)}"],
        )

        raw_text = response.text.strip()
        print(f"[analyzeMapCrime] 🤖 RAW:\n{raw_text}")

        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1]
        if "```" in raw_text:
            raw_text = raw_text.split("```")[0]

        result_data = json.loads(raw_text.strip())
        return _json_response({"success": True, "data": result_data}, 200, req)

    except Exception as e:
        print(f"[analyzeMapCrime] 🔥 Error: {e}")
        return _json_response({"success": False, "error": "AI parsing or safety filter error.", "details": str(e)}, 500, req)

@https_fn.on_request()
def getGooglePlaceInfo(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    place = req.args.get("place", "")
    return _json_response(
        {
            "success": True,
            "place_name": place,
            "image_url": "https://maps.gstatic.com/tactile/pane/default_geocode-2x.png",
        },
        200, req,
    )

@https_fn.on_request()
def bulkUploadTeam(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    rate_limit_err = _enforce_rate_limit(req, "bulkUploadTeam")
    if rate_limit_err:
        return rate_limit_err

    try:
        if "file" not in req.files:
            return _json_response({"success": False, "error": "No file uploaded"}, 400, req)

        file = req.files["file"]
        filename = file.filename or ""
        if not filename:
            return _json_response({"success": False, "error": "No selected file"}, 400, req)

        processed_text = _parse_uploaded_file(file)

        team_prompt = """
        You are a data extraction assistant. I will provide raw text parsed from a file.
        Extract all individuals who appear to be team members or contacts.

        CRITICAL RULES:
        1. Return ONLY a clean JSON array of objects.
        2. No markdown fences, no formatting, no conversational text.
        3. Each object must use exactly these keys: "name", "email", "role".
        4. If a role is missing, default it to "Member".
        5. If you cannot confidently find a name or email, skip that person.

        Example:
        [
          {"name": "Alice Johnson", "email": "alice@example.com", "role": "Developer"}
        ]
        """

        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[team_prompt, f"Raw File Data:\n{processed_text}"],
        )

        raw_text = response.text.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1]
        if "```" in raw_text:
            raw_text = raw_text.split("```")[0]

        parsed = json.loads(raw_text.strip())
        return _json_response({"success": True, "team": parsed}, 200, req)

    except Exception as e:
        print(f"[bulkUploadTeam] 🔥 Error: {e}")
        return _json_response({"success": False, "error": "Failed to parse data.", "details": str(e)}, 500, req)

@https_fn.on_request()
def root(req: https_fn.Request) -> https_fn.Response:
    preflight = _handle_cors_preflight(req)
    if preflight:
        return preflight

    return _json_response(
        {
            "app": "Kith Risk Dashboard API",
            "status": "Running",
            "sdk": "google-genai (new)",
            "runtime": "Firebase Functions (Python)",
            "endpoints": [
                "/analyzeSurvey", "/fetchPeopleInfo", "/bulkUpload",
                "/analyzeMapCrime", "/getGooglePlaceInfo", "/generateContent",
                "/analyzeEconomy", "/bulkUploadTeam",
            ],
        },
        200, req,
    )
