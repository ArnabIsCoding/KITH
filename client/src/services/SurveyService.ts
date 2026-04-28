
import { ref, push } from "firebase/database";
import { sanitizeRecord } from "./PrivacyService";
import { database } from "../firebase";

export interface Profile {
  homeAddress: string;
  workAddress: string;
}

const baseInstruction = `
Act as a data scientist with expertise in Google APIs, particularly Google Maps and Places. Your primary role is to analyze and interpret user search data to create a profile focusing on transportation habits. Adopt a supportive, trustworthy, and approachable demeanor, using your strong analytical capabilities and understanding of user behavior to deliver precise results.
`;

const task = `
1. Extract and read the JSON data from the uploaded .txt file silently.
2. Analyze the JSON data to identify key search terms and locations silently.
3. Access Google Maps & Places APIs for additional insights into the search data silently.
4. Analyze patterns in the search data to deduce lifestyle preferences and routine activities of the user silently.
5. Generate and output a JSON structure with preferences of the user based on the analysis. The output should strictly adhere to the specified JSON format without additional commentary.
`;

export function createAddressInstruction() {
  return `"homeAddress": "full Address", "workAddress": "full Address"`;
}

export function createTransportationInstruction() {
  return `
    "transportation": [
      {
        "method": "string",
        "selected": "boolean",
        "radius": "number"
      }
    ]
  `;
}

export function createCategoriesInstruction() {
  return `
    "categories": [
      {
        "title": "string",
        "userPreferences": "string",
        "environmentDescriptors": ["string"],
        "relatedSubcategories": ["string"],
        "costPreference": "string",
        "confidence": "number"
      }
    ]
  `;
}

export function createSocialPreferencesInstruction() {
  return `
    {
      "socialPreferences": [
        {
          "name": "string",
          "selected": "boolean",
          "description": "string"
        }
      ]
    }
  `;
}

export const saveOnboardingDataIfHasLocation = async (
  analyzedData: any,
  source: string,
  userId: string
): Promise<boolean> => {

  const hasCoords =
    typeof analyzedData.lat === "number" &&
    typeof analyzedData.lng === "number";

  if (!hasCoords) {
    console.log(`[${source}] No GPS coordinates found. Skipping Firebase upload.`);
    return false;
  }

  if (!userId) {
    console.error(`[${source}] No userId provided. Cannot save to Firebase.`);
    return false;
  }

  try {
    const sanitized = sanitizeRecord({
      ...analyzedData,
      sourceMethod: source,
      savedAt: new Date().toISOString(),
    });

    const onboardingRef = ref(database, `users/${userId}/onboardingData`);
    await push(onboardingRef, sanitized);

    console.log(`[${source}] ✅ Saved to Firebase at users/${userId}/onboardingData`);
    return true;
  } catch (error) {
    console.error(`[${source}] ❌ Firebase write failed:`, error);
    return false;
  }
};
