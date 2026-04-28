import { ref, get, update } from "firebase/database";
import { database } from "../firebase";

const ALLOWED_FIELDS = new Set([
  "lat",
  "lng",
  "location",
  "risk_score",
  "community_hotspot_level",
  "explanation",
  "key_factors",
  "demographicSize",
  "ageGroup",
  "gender",
  "sourceMethod",
  "savedAt",
  "collectionDate",
  "archivedAt",
  "archived",
]);

export function sanitizeRecord(raw: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (typeof value === "string" && looksLikePII(value)) {
      console.warn(`[PrivacyService] Dropped field "${key}" — value resembles PII.`);
      continue;
    }

    clean[key] = value;
  }
  if (typeof clean.location === "string") {
    clean.location = coarsenLocation(clean.location);
  }

  return clean;
}
function looksLikePII(value: string): boolean {
  const email  = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone  = /(\+?\d[\s\-.]?){9,13}/;
  const name   = /\b([A-Z][a-z]{1,15}\s){1,2}[A-Z][a-z]{1,15}\b/;
  const aadhaar = /\b\d{4}\s\d{4}\s\d{4}\b/;

  return email.test(value) || phone.test(value) || aadhaar.test(value);
}

function coarsenLocation(address: string): string {
  const parts = address
    .split(",")
    .map(p => p.trim())
    .filter(p => p.length > 0 && !/\d/.test(p));
  return parts.slice(-2).join(", ") || address;
}

export const MIN_PROFILES_FOR_SCORE = 1;

export function meetsAggregationThreshold(profileCount: number): boolean {
  return profileCount >= MIN_PROFILES_FOR_SCORE;
}

const RETENTION_DAYS = 90;
export async function runRetentionPass(userId: string): Promise<number> {
  if (!userId) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const snap = await get(ref(database, `users/${userId}/onboardingData`));
  if (!snap.exists()) return 0;

  const data  = snap.val() as Record<string, any>;
  const keys  = Object.keys(data);
  let archived = 0;

  for (const key of keys) {
    const record = data[key];
    if (record.archived) continue;

    const savedAt = record.savedAt ? new Date(record.savedAt) : null;
    if (!savedAt) continue;

    if (savedAt < cutoff) {
      await update(
        ref(database, `users/${userId}/onboardingData/${key}`),
        {
          archived:   true,
          archivedAt: new Date().toISOString(),
        }
      );
      archived++;
    }
  }

  if (archived > 0) {
    console.log(`[PrivacyService] Retention pass: archived ${archived} record(s) for user ${userId}`);
  }

  return archived;
}

export function filterActive<T extends { archived?: boolean }>(records: T[]): T[] {
  return records.filter(r => !r.archived);
}
