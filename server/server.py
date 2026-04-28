"""
server.py — migrated from google.generativeai to google-genai SDK

Changes from original:
  1. `import google.generativeai as genai` → `from google import genai`
     and updated all direct model calls to use the new client API
  2. /analyzeSurvey image path now uses client.models.generate_content()
  3. /analyzeMapCrime and /bulkUploadTeam also updated
  4. CORS origins updated to allow both localhost:3000 and production domain

Install:
    pip install google-genai flask flask-cors python-dotenv pandas openpyxl
"""

import os
import json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from system_instructions import generate_content

from google import genai
from google.genai import types

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

load_dotenv()

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": [
    "http://localhost:3000",
    "https://sahayak-risk-dashboard.web.app",
		"https://sahayak-risk-dashboard.firebaseapp.com",
		"https://kith.arnabiscoding.com"
]}}, supports_credentials=True)
@app.after_request
def add_cors_headers(response):
    allowed_origins = [
        "http://localhost:3000",
        "https://sahayak-risk-dashboard.web.app",
        "https://sahayak-risk-dashboard.firebaseapp.com",
        "https://kith.arnabiscoding.com",
    ]
    origin = request.headers.get("Origin", "")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"]  = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    response = app.make_default_options_response()
    allowed_origins = [
        "http://localhost:3000",
        "https://sahayak-risk-dashboard.web.app",
        "https://sahayak-risk-dashboard.firebaseapp.com",
        "https://kith.arnabiscoding.com",
    ]
    origin = request.headers.get("Origin", "")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"]  = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response
API_KEY = os.getenv("REACT_APP_geminiAIKey", "")

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


def get_gemini_client():
    return genai.Client(api_key=API_KEY)

@app.route('/fetchPeopleInfo', methods=['GET', 'OPTIONS'])
def fetch_people_info():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "success": True,
        "message": "Kith Backend Linked",
        "system_status": "Active",
    })
@app.route('/bulkUpload', methods=['POST'])
def bulk_upload():
    try:
        if 'file' not in request.files:
            print(f"[bulk-upload] ❌ No file in request.files. Keys: {list(request.files.keys())}, Form: {list(request.form.keys())}")
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        file = request.files['file']
        filename = file.filename or ""

        if filename == '':
            return jsonify({"success": False, "error": "No selected file"}), 400

        print(f"[bulk-upload] ✅ Received: {filename} ({file.content_type})")

        processed_text = ""
        if filename.endswith('.json'):
            data = json.load(file)
            processed_text = json.dumps(data)
        elif filename.endswith('.csv'):
            df = pd.read_csv(file)
            processed_text = df.to_string()
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
            processed_text = df.to_string()
        else:
            processed_text = file.read().decode('utf-8', errors='ignore')

        search_prompt = f"Please analyze the following bulk survey data:\n\n{processed_text}"
        result = generate_content(GEMINI_PROMPT, search_prompt)

        if result:
            return jsonify({"success": True, "filename": filename, "analysis": result})
        else:
            return jsonify({"success": False, "error": "AI failed to generate a valid response after multiple attempts."}), 500

    except Exception as e:
        print(f"[bulk-upload] 🔥 Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/analyzeSurvey', methods=['POST'])
def analyze_survey():
    try:
        survey_text = request.form.get('survey_text', '')
        image_file  = request.files.get('image')

        if image_file:
            client = get_gemini_client()
            image_bytes = image_file.read()
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    GEMINI_PROMPT,
                    f"Additional User Text: {survey_text}",
                    types.Part.from_bytes(data=image_bytes, mime_type=image_file.mimetype),
                ],
            )

            raw_text = response.text.strip()
            if "```" in raw_text:
                raw_text = raw_text.split("```")[1].replace("json", "").strip()
            result = json.loads(raw_text)

        else:
            search_prompt = f"Input Data: {survey_text}"
            result = generate_content(GEMINI_PROMPT, search_prompt)
            if not result:
                raise Exception("AI failed to generate a valid response.")

        return jsonify({
            "success":                True,
            "risk_score":             result.get("risk_score", 0),
            "explanation":            result.get("explanation", "No explanation provided."),
            "community_hotspot_level": result.get("community_hotspot_level", "low"),
            "key_factors":            result.get("key_factors", []),
            "location":               result.get("location", None),
        })

    except Exception as e:
        print(f"[analyze-survey] 🔥 Error: {str(e)}")
        return jsonify({"success": False, "error": "Internal Server Error", "details": str(e)}), 500


@app.route('/analyzeEconomy', methods=['POST', 'OPTIONS'])
def analyze_economy():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    try:
        data     = request.get_json()
        location = data.get('location', '')

        if not location:
            return jsonify({"success": False, "error": "Location string is missing"}), 400

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
        result = generate_content(economic_prompt, f"Location to Analyze: {location}")

        if result:
            return jsonify({"success": True, "data": result})
        else:
            return jsonify({"success": False, "error": "AI failed to generate a valid economic response."}), 500

    except Exception as e:
        print(f"[analyze-economy] 🔥 Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/generateContent', methods=['POST', 'OPTIONS'])
def generate_custom_content():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    try:
        data               = request.get_json()
        system_instruction = data.get('system_instruction', '')
        search_prompt      = data.get('search_prompt', '')

        result = generate_content(system_instruction, search_prompt)
        if result:
            return jsonify(result)
        else:
            return jsonify([]), 500

    except Exception as e:
        print(f"[generate-content] 🔥 Error: {str(e)}")
        return jsonify([]), 500

@app.route('/analyzeMapCrime', methods=['POST', 'OPTIONS'])
def analyze_map_crime():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        data      = request.get_json()
        locations = data.get('locations', [])

        if not locations:
            return jsonify({"success": False, "error": "No locations provided"}), 400

        print(f"[analyze-map-crime] 📍 Sending prompt for {len(locations)} location(s)...")

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

        client   = get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[heatmap_prompt, f"Locations to analyze:\n{json.dumps(locations)}"],
        )

        raw_text = response.text.strip()
        print(f"[analyze-map-crime] 🤖 RAW:\n{raw_text}\n")

        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1]
        if "```" in raw_text:
            raw_text = raw_text.split("```")[0]

        result_data = json.loads(raw_text.strip())
        return jsonify({"success": True, "data": result_data})

    except Exception as e:
        print(f"[analyze-map-crime] 🔥 Error: {str(e)}")
        return jsonify({"success": False, "error": "AI parsing or safety filter error.", "details": str(e)}), 500

@app.route('/getGooglePlaceInfo', methods=['GET', 'OPTIONS'])
def get_google_place_info():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    place = request.args.get('place', '')
    return jsonify({
        "success":   True,
        "place_name": place,
        "image_url": "https://maps.gstatic.com/tactile/pane/default_geocode-2x.png",
    })

@app.route('/bulkUploadTeam', methods=['POST'])
def bulk_upload_team():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400

        file     = request.files['file']
        filename = file.filename or ""

        if filename == '':
            return jsonify({"success": False, "error": "No selected file"}), 400

        processed_text = ""
        if filename.endswith('.json'):
            data = json.load(file)
            processed_text = json.dumps(data)
        elif filename.endswith('.csv'):
            df = pd.read_csv(file)
            processed_text = df.to_string()
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
            processed_text = df.to_string()
        else:
            processed_text = file.read().decode('utf-8', errors='ignore')

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

        client   = get_gemini_client()
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
        return jsonify({"success": True, "team": parsed})

    except Exception as e:
        print(f"[bulk-uploadTeam] 🔥 Error: {str(e)}")
        return jsonify({"success": False, "error": "Failed to parse data.", "details": str(e)}), 500

@app.route('/')
def home():
    return jsonify({
        "app":       "Kith Risk Dashboard API",
        "status":    "Running",
        "sdk":       "google-genai (new)",
        "endpoints": [
            "/analyzeSurvey", "/fetchPeopleInfo", "/bulkUpload",
            "/analyzeMapCrime", "/getGooglePlaceInfo", "/generateContent",
            "/analyzeEconomy", "/bulkUploadTeam",
        ],
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
