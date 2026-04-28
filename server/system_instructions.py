"""
system_instructions.py — migrated to google-genai SDK

The old google.generativeai package is deprecated and will stop receiving
updates. This file migrates to the new google-genai package while keeping
the same generate_content() signature so server.py needs no changes.

Install the new package:
    pip install google-genai

You can remove the old one:
    pip uninstall google-generativeai
"""

from dotenv import load_dotenv
import os
import json
import time
from google import genai
from google.genai import types
from google.api_core.exceptions import DeadlineExceeded, ResourceExhausted

load_dotenv()


def extract_json_from_output(output: str):
    """Strip markdown fences and parse JSON."""
    cleaned = output.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


def generate_content(system_instruction: str, search_prompt: str):
    """
    Drop-in replacement for the old generate_content().
    Returns a parsed Python dict/list on success, or None on failure.
    """
    api_key = os.getenv("REACT_APP_geminiAIKey", "")
    if not api_key:
        print("[Gemini] ❌ No API key found in environment.")
        return None

    client = genai.Client(vertexai=True, project="sahayak-risk-dashboard", location="us-central1")

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

    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=["Follow the system instructions and", search_prompt],
                config=config,
            )
            print("Original Response", response.text)
            result = extract_json_from_output(response.text)
            return result

        except DeadlineExceeded:
            print(f"[Gemini] Deadline exceeded (attempt {attempt + 1}). Retrying in 1s...")
            time.sleep(1)

        except json.JSONDecodeError:
            print(f"[Gemini] JSON decode error (attempt {attempt + 1}). Retrying in 1s...")
            time.sleep(1)

        except ResourceExhausted:
            print(f"[Gemini] Resource exhausted (attempt {attempt + 1}). Retrying in 10s...")
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

    print("[Gemini] ❌ Failed after all attempts.")
    return None
