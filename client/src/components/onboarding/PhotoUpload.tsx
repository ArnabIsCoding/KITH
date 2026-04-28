
import React, { useCallback, useEffect, useState, useRef } from "react";
import { OnboardPageProps } from "../../models/OnboardPageProps";
import { Typography, Paper, Stack, Button, Box, IconButton } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DeleteIcon from "@mui/icons-material/Delete";
import AnalysisResultUI from "./AnalysisResultUI";
import { auth } from "../../firebase";
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

const PhotoUpload: React.FC<OnboardPageProps> = (props) => {
  const [imageSrcs,     setImageSrcs]     = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status,        setStatus]        = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result,        setResult]        = useState<any>(null);
  const [errorMsg,      setErrorMsg]      = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveData = useCallback(() => {
    console.log("Picture upload save triggered.");
  }, []);

  useEffect(() => { props.registerSave(saveData); }, [props, saveData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);

    const reads = files.map(file => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    }));
    const newImages = await Promise.all(reads);
    setImageSrcs(prev => [...prev, ...newImages]);
    setStatus("idle");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (i: number) => {
    setImageSrcs(prev => prev.filter((_, idx) => idx !== i));
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleReset = () => {
    setStatus("idle");
    setResult(null);
    setImageSrcs([]);
    setSelectedFiles([]);
    setErrorMsg("");
  };

  const processWithGemini = async () => {
    if (!selectedFiles.length) return;
    setStatus("loading");

    try {
      const authHeader = await getAuthHeader();

      const formData = new FormData();
      formData.append("image", selectedFiles[0]);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/analyzeSurvey`, {
        method:  "POST",
        headers: authHeader,
        body:    formData,
      });

      if (!response.ok) {
        let msg = `Server error ${response.status}`;
        try { const d = await response.json(); msg = d.error || msg; } catch {}
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
        setErrorMsg(data.error || "Failed to process image.");
      }
    } catch (err) {
      console.error("Picture upload error:", err);
      setStatus("error");
      setErrorMsg("Failed to connect to backend.");
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
          uploadType="picture_upload"
        />
      </div>
    );
  }

  return (
    <>
      <Typography variant="h4" sx={{ marginTop: "1rem", marginBottom: "1rem", textAlign: "center" }}>
        Photo Upload (AI Analysis)
      </Typography>
      <Typography variant="body1" sx={{ textAlign: "center", mb: 3 }}>
        Upload photos of documents or field reports. Gemini will extract demographic data and risk indicators.
      </Typography>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
        <Paper style={{
          padding: "3rem", borderRadius: "0.5rem",
          backgroundColor: "#F3F5EA", width: "100%", maxWidth: "700px", textAlign: "center",
        }}>
          <Stack spacing={4} alignItems="center">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/jpeg,image/png,image/webp,image/gif,image/*"
              multiple
              onChange={handleFileChange}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #1976d2", padding: "2rem", borderRadius: "8px",
                cursor: "pointer", backgroundColor: "#fff",
                display: "flex", flexDirection: "column", alignItems: "center", width: "100%",
              }}
            >
              <AddPhotoAlternateIcon style={{ fontSize: "4rem", color: "#1976d2", marginBottom: "1rem" }} />
              <Typography variant="h6">Click to select images</Typography>
              <Typography variant="body2" color="textSecondary">You can select multiple files at once</Typography>
            </div>

            {imageSrcs.length > 0 && (
              <Box style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "1rem" }}>
                {imageSrcs.map((src, i) => (
                  <Box key={i} style={{ position: "relative", width: "120px", height: "120px" }}>
                    <img
                      src={src} alt={`Preview ${i}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px", border: "1px solid #ddd" }}
                    />
                    <IconButton
                      size="small" color="error"
                      style={{
                        position: "absolute", top: -10, right: -10,
                        backgroundColor: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", padding: "4px",
                      }}
                      onClick={() => removeImage(i)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            <Button
              variant="contained" color="primary"
              disabled={!imageSrcs.length}
              onClick={processWithGemini}
              size="large"
            >
              Analyze {imageSrcs.length > 0 ? `${imageSrcs.length} Image(s)` : "with Gemini"}
            </Button>
          </Stack>
        </Paper>
      </div>
    </>
  );
};

export default PhotoUpload;
