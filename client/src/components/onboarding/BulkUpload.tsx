
import React, { useCallback, useEffect, useState, useRef } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { UploadCloud } from "lucide-react";
import AnalysisResultUI from "./AnalysisResultUI";
import { enqueue, isOnline } from "../../services/OfflineSyncService";
import { UserAuth } from "../../context/AuthContext";
import { auth as firebaseAuth } from "../../firebase";
import {
  ACCENT, INK, INK_20, INK_60, PAPER_DARK,
  FONT_MONO, FONT_BODY, btnPrimary,
} from "../../theme";

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    csv:  "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls:  "application/vnd.ms-excel",
    json: "application/json",
    txt:  "text/plain",
    doc:  "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "application/octet-stream";
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

const BulkUpload: React.FC<OnboardPageProps> = (props) => {
  const [file,     setFile]     = useState<File | null>(null);
  const [status,   setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result,   setResult]   = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = UserAuth();

  const saveData = useCallback(() => {
    console.log("Bulk upload complete — no additional parent save needed.");
  }, []);

  useEffect(() => { props.registerSave(saveData); }, [props, saveData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setErrorMsg("");
    }
  };

  const handleReset = () => {
    setFile(null); setResult(null);
    setStatus("idle"); setErrorMsg("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("loading");

    const mime = getMimeType(file);
    const blob = mime === file.type
      ? file
      : new Blob([await file.arrayBuffer()], { type: mime });

    const formData = new FormData();
    formData.append("file", blob, file.name);

    console.log(`[BulkUpload] Sending "${file.name}" as "${mime}" (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      const authHeader = await getAuthHeader();

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/bulkUpload`, {
        method:  "POST",
        headers: authHeader,
        body:    formData,
      });

      if (!response.ok) {
        let serverMsg = `Server error ${response.status}`;
        try { const d = await response.json(); serverMsg = d.error || serverMsg; } catch {}
        console.error(`[BulkUpload] Server returned ${response.status}: ${serverMsg}`);
        setStatus("error");
        setErrorMsg(serverMsg);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.analysis);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Gemini analysis failed. Please try again.");
      }

    } catch (networkErr) {
      console.error("[BulkUpload] Network error:", networkErr);

      await enqueue({
        payload:    { fileName: file.name, fileSize: file.size, note: "Bulk file — re-upload required on sync" },
        uploadType: "bulk_upload",
        endpoint:   `/bulkUpload`,
        label:      `Bulk file · ${file.name}`,
        userId:     auth?.user?.id ?? "",
      });

      setStatus("error");
      setErrorMsg(
        !isOnline()
          ? "You are offline. File metadata queued — re-upload when connected."
          : "Backend unreachable. Check that the server is running."
      );
    }
  };

  if (status !== "idle") {
    return (
      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "2rem" }}>
        <AnalysisResultUI
          status={status}
          result={result}
          errorMsg={errorMsg}
          onReset={handleReset}
          uploadType="bulk_upload"
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <div style={{
        width: "100%", maxWidth: 600,
        border: `1px solid ${INK_20}`,
        padding: "48px 40px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 32,
        background: PAPER_DARK,
      }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: INK_60, marginBottom: 12, textAlign: "center" }}>
            Bulk Data Ingestion
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.9rem", color: INK_60, lineHeight: 1.7, margin: 0, textAlign: "center" }}>
            Upload raw Excel, CSV, Word, or JSON survey files. Gemini will extract demographic risk indicators automatically.
          </p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%", padding: "40px 24px",
            border: `1px dashed ${file ? ACCENT : INK_20}`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            cursor: "pointer", transition: "border-color 0.2s",
            background: file ? "rgba(200,255,0,0.04)" : "transparent",
          }}
          onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = INK_60; }}
          onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = INK_20; }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".xlsx,.xls,.doc,.docx,.json,.csv,.txt"
            onChange={handleFileChange}
          />
          <UploadCloud size={32} color={file ? ACCENT : INK_60} strokeWidth={1.5} />
          <div style={{ fontFamily: FONT_MONO, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: file ? INK : INK_60 }}>
            {file ? file.name : "Click to select file"}
          </div>
          {file && (
            <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.12em", color: INK_60 }}>
              {(file.size / 1024).toFixed(1)} KB · {getMimeType(file)}
            </div>
          )}
          {!file && (
            <div style={{ fontFamily: FONT_MONO, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK_20 }}>
              xlsx · xls · csv · json · doc · txt
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file}
          style={{
            ...btnPrimary,
            fontSize: "10px", width: "100%", justifyContent: "center",
            opacity: !file ? 0.4 : 1,
          }}
          onMouseEnter={e => { if (file) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { if (file) e.currentTarget.style.opacity = "1"; }}
        >
          Process File with Gemini
        </button>
      </div>
    </div>
  );
};

export default BulkUpload;
