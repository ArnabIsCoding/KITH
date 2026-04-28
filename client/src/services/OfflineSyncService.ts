
import { ref, push } from "firebase/database";
import { database, auth as firebaseAuth } from "../firebase";
import { sanitizeRecord } from "./PrivacyService";

const DB_NAME    = "kith_offline";
const DB_VERSION = 1;
const STORE      = "pending_surveys";

export interface PendingSurvey {
  id:         string;
  payload:    Record<string, any>;
  uploadType: "bulk_upload" | "direct_upload" | "picture_upload";
  endpoint:   string;
  timestamp:  string;
  retries:    number;
  label:      string;
  userId:     string;
}

export type SyncItemStatus = "syncing" | "done" | "failed" | "skipped";
let isSyncingInternal = false;
type QueueListener = () => void;
const listeners = new Set<QueueListener>();

export function onQueueChange(cb: QueueListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(): void {
  listeners.forEach(cb => { try { cb(); } catch {} });
}

async function getSyncAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken(/* forceRefresh */ true);
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = e => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function enqueue(
  survey: Omit<PendingSurvey, "id" | "timestamp" | "retries">
): Promise<string> {
  const safePayload = JSON.parse(JSON.stringify(survey.payload ?? {}));

  const db = await openDB();
  const record: PendingSurvey = {
    ...survey,
    payload:   safePayload,
    id:        crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retries:   0,
  };

  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject((e.target as IDBRequest).error);
  });

  notifyListeners();
  return record.id;
}

export async function getAll(): Promise<PendingSurvey[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve((e.target as IDBRequest<PendingSurvey[]>).result ?? []);
    req.onerror   = e => reject((e.target as IDBRequest).error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject((e.target as IDBRequest).error);
  });
  notifyListeners();
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = e => {
      const record: PendingSurvey = (e.target as IDBRequest).result;
      if (!record) { resolve(); return; }
      record.retries += 1;
      store.put(record).onsuccess = () => resolve();
    };
    getReq.onerror = e => reject((e.target as IDBRequest).error);
  });
}
async function saveResultToFirebase(
  geminiResult: Record<string, any>,
  originalPayload: Record<string, any>,
  uploadType: string,
  userId: string,
  locationString: string,
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const sanitized = sanitizeRecord({
      ...originalPayload,
      ...geminiResult,
      location:     locationString,
      lat,
      lng,
      sourceMethod: uploadType,
      savedAt:      new Date().toISOString(),
    });
    await push(ref(database, `users/${userId}/onboardingData`), sanitized);
    console.log(`[OfflineSync] ✅ Saved to Firebase: users/${userId}/onboardingData`);
    return true;
  } catch (e) {
    console.error("[OfflineSync] ❌ Firebase write failed:", e);
    return false;
  }
}

function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!window.google?.maps) { resolve(null); return; }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });
}

export async function syncPending(
  onProgress?: (id: string, status: SyncItemStatus) => void
): Promise<number> {
  if (!navigator.onLine) return 0;
  if (isSyncingInternal) return 0;

  isSyncingInternal = true;
  let synced = 0;

  try {
    const pending = await getAll();

    for (const survey of pending) {
      if (survey.uploadType === "bulk_upload") {
        onProgress?.(survey.id, "skipped");
        continue;
      }

      onProgress?.(survey.id, "syncing");

      try {
        const formData = new FormData();

        if (survey.uploadType === "picture_upload" && survey.payload?.file) {
          formData.append("image", survey.payload.file);
        } else {
          formData.append("survey_text", JSON.stringify(survey.payload));
        }
        const authHeader = await getSyncAuthHeader();

        const res = await fetch(survey.endpoint, {
          method:  "POST",
          headers: authHeader,
          body:    formData,
          signal:  AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[OfflineSync] ❌ ${res.status} for survey ${survey.id}`);
          await incrementRetry(survey.id);
          onProgress?.(survey.id, "failed");
          continue;
        }

        const data = await res.json();
        if (!data.success) {
          await incrementRetry(survey.id);
          onProgress?.(survey.id, "failed");
          continue;
        }
        const locationString =
          data.location ||
          survey.payload?.method?.address ||
          survey.payload?.method?.communityLocation ||
          null;

        if (!locationString) {
          await remove(survey.id);
          onProgress?.(survey.id, "done");
          synced++;
          continue;
        }
        const coords = await geocode(locationString);
        if (!coords) {
          await remove(survey.id);
          onProgress?.(survey.id, "done");
          synced++;
          continue;
        }
        await saveResultToFirebase(
          data,
          survey.payload,
          survey.uploadType,
          survey.userId,
          locationString,
          coords.lat,
          coords.lng
        );

        window.dispatchEvent(new CustomEvent("kith:analysis-ready", {
          detail: {
            result:     data,
            uploadType: survey.uploadType,
          },
        }));
        await remove(survey.id);
        onProgress?.(survey.id, "done");
        synced++;

      } catch (e) {
        console.error("[OfflineSync] Error syncing item:", survey.id, e);
        await incrementRetry(survey.id);
        onProgress?.(survey.id, "failed");
      }
    }
  } finally {
    isSyncingInternal = false;
  }

  return synced;
}
export function isOnline(): boolean {
  return navigator.onLine;
}

export function watchConnectivity(cb: (online: boolean) => void): () => void {
  const on  = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online",  on);
  window.addEventListener("offline", off);
  cb(navigator.onLine);
  return () => {
    window.removeEventListener("online",  on);
    window.removeEventListener("offline", off);
  };
}
