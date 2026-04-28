
import React, { useCallback, useEffect, useRef, useState } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { Divider, Typography, Button } from "@mui/material";

import ProfileForm        from "./ProfileForm";
import EconomicsHelperForm from "./EconomicsHelperForm";
import PreferencesForm    from "./PreferencesForm";
import ReviewForm         from "./ReviewForm";
import CategoriesForm     from "./CategoriesForm";
import AnalysisResultUI   from "./AnalysisResultUI";
import { enqueue, isOnline } from "../../services/OfflineSyncService";
import { UserAuth }          from "../../context/AuthContext";
import { auth }              from "../../firebase";

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

const DirectUpload: React.FC<OnboardPageProps> = (props) => {
  const auth = UserAuth();
  const saveFunctions = useRef<Record<string, () => any>>({});

  const [status,   setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result,   setResult]   = useState<any>(null);
  const [rawData,  setRawData]  = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const registerMethodSave = useCallback((fn: () => any) => { saveFunctions.current["method"] = fn; }, []);
  const registerTransSave  = useCallback((fn: () => any) => { saveFunctions.current["trans"]  = fn; }, []);
  const registerPrefSave   = useCallback((fn: () => any) => { saveFunctions.current["pref"]   = fn; }, []);
  const registerReviewSave = useCallback((fn: () => any) => { saveFunctions.current["review"] = fn; }, []);
  const registerCatSave    = useCallback((fn: () => any) => { saveFunctions.current["cat"]    = fn; }, []);

  useEffect(() => {
    const handleBackgroundSync = (e: any) => {
      const { result: syncResult, uploadType } = e.detail;
      if (uploadType === "direct_upload") {
        setResult(syncResult);
        setStatus("success");
      }
    };
    window.addEventListener("kith:analysis-ready", handleBackgroundSync);
    return () => window.removeEventListener("kith:analysis-ready", handleBackgroundSync);
  }, []);

  const saveAllData = useCallback(async () => {
    setStatus("loading");

    try {
      const compiledData: Record<string, any> = {};

      for (const key of Object.keys(saveFunctions.current)) {
        const fn = saveFunctions.current[key];
        if (typeof fn !== "function") continue;
        const returnValue = fn();
        if (returnValue && typeof returnValue.then === "function") continue;
        if (returnValue && typeof returnValue === "object") {
          compiledData[key] = JSON.parse(JSON.stringify(returnValue));
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setRawData(compiledData);

      const locationGuess =
        compiledData?.method?.address ||
        compiledData?.method?.communityLocation ||
        "Unknown location";
      if (!isOnline()) {
        await enqueue({
          payload:    compiledData,
          uploadType: "direct_upload",
          endpoint:   `/analyzeSurvey`,
          label:      `Manual entry · ${locationGuess}`,
          userId:     auth?.user?.id ?? "",
        });
        setStatus("error");
        setErrorMsg("You are offline. Survey saved locally and will sync automatically when connected.");
        return;
      }

      const authHeader = await getAuthHeader();

      const formData = new FormData();
      formData.append("survey_text", JSON.stringify(compiledData));

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeSurvey`, {
        method:  "POST",
        headers: authHeader,
        body:    formData,
        signal:  AbortSignal.timeout(90000),
      });

      if (!response.ok) {
        let msg = `Server error ${response.status}`;
        try { const d = await response.json(); msg = d.error || msg; } catch {}
        if (response.status === 429) {
          setStatus("error");
          setErrorMsg(msg);
          return;
        }
        setStatus("error");
        setErrorMsg(msg);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.analysis ?? data);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Analysis failed.");
      }

    } catch (networkErr: any) {
      console.error("[DirectUpload] Network error:", networkErr);
      const isTimeout = networkErr?.name === "TimeoutError" || networkErr?.name === "AbortError";

      if (isTimeout) {
        setStatus("error");
        setErrorMsg("Analysis is taking longer than expected. Please try again — Vertex AI may be warming up.");
        return;
      }

      const compiledDataFallback = rawData ?? {};
      const fallbackLocation =
        compiledDataFallback?.method?.address ||
        compiledDataFallback?.method?.communityLocation ||
        "Unknown location";

      try {
        await enqueue({
          payload:    compiledDataFallback,
          uploadType: "direct_upload",
          endpoint:   `/analyzeSurvey`,
          label:      `Manual entry · ${fallbackLocation}`,
          userId:     auth?.user?.id ?? "",
        });
        setStatus("error");
        setErrorMsg("Backend unreachable. Survey saved locally and will sync automatically when connected.");
      } catch (queueErr) {
        console.error("[DirectUpload] Enqueue failed:", queueErr);
        setStatus("error");
        setErrorMsg("Failed to save offline. Please try again.");
      }
    }
  }, [auth?.user?.id, rawData]);

	useEffect(() => { props.registerSave(saveAllData); }, [props, saveAllData]);
	
  const handleReset = () => {
    setStatus("idle");
    setResult(null);
    setRawData(null);
    setErrorMsg("");
    setResetKey(k => k + 1);
    window.scrollTo(0, 0);
  };

  if (status !== "idle") {
    return (
      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "2rem" }}>
        <AnalysisResultUI
          status={status}
          result={result}
          errorMsg={errorMsg}
          onReset={handleReset}
          uploadType="direct_upload"
          rawData={rawData}
        />
      </div>
    );
  }

  const dividerStyle: React.CSSProperties = { margin: "2rem 0", backgroundColor: "#ccc", width: "100%" };
  const wrapperStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4rem", alignItems: "center" };
  const formStyle:    React.CSSProperties = { width: "100%", maxWidth: "800px" };

  return (
    <div style={wrapperStyle}>
      <div style={formStyle} key={resetKey}>
        <Typography variant="h3" textAlign="center" gutterBottom>Direct Manual Upload</Typography>
        <Typography variant="body1" textAlign="center" color="textSecondary" mb={4}>
          Fill out as much or as little detail as you want. All sections are optional.
        </Typography>

        <section><ProfileForm         registerSave={registerMethodSave} /></section>
        <Divider style={dividerStyle} />
        <section><EconomicsHelperForm  registerSave={registerTransSave} /></section>
        <Divider style={dividerStyle} />
        <section><PreferencesForm     registerSave={registerPrefSave} /></section>
        <Divider style={dividerStyle} />
        <section><ReviewForm          registerSave={registerReviewSave} /></section>
        <Divider style={dividerStyle} />
        <section><CategoriesForm      registerSave={registerCatSave} /></section>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem" }}>
          <Button variant="contained" color="success" size="large" onClick={saveAllData}>
            Save & Analyze with Gemini
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DirectUpload;
